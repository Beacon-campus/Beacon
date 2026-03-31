import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { auth } from "../../../firebase/firebase";
import apiClient from "../../../services/apiClient";
import { useAuth } from "../../../context/AuthContext";
import LoadingState from "../../../components/ui/LoadingState";

export default function QuizActive() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [violation, setViolation] = useState(false);
  const [isProtecting, setIsProtecting] = useState(false);
  const hasFlaggedCheatRef = useRef(false);

  const recordCheat = async () => {
    if (hasFlaggedCheatRef.current) return;
    hasFlaggedCheatRef.current = true;
    try {
      await apiClient.post(`/assignments/${assignmentId}/flag-cheat`, {});
    } catch (error) {
      console.error("Failed to record cheat flag", error);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem(`quiz_active_${assignmentId}`)) {
      sessionStorage.removeItem(`quiz_active_${assignmentId}`);
      toast.error("Quiz terminated due to refresh/navigation.");
      navigate("/student/community");
    }
  }, [assignmentId, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast.error("Please login first");
      navigate("/");
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await apiClient.get(`/assignments/${assignmentId}`);
        const assignmentData = res.data;
        setAssignment(assignmentData);

        if (assignmentData?.type !== "quiz") {
          toast.error("This assignment is not a quiz.");
          navigate("/student/community");
          return;
        }

        setTimeRemaining(assignmentData?.duration ? assignmentData.duration * 60 : 600);

        const subRes = await apiClient.get("/assignments/my-submissions");
        if (Array.isArray(subRes.data) && subRes.data.includes(assignmentId)) {
          setSubmitted(true);
        }
      } catch (error) {
        console.error("Error fetching quiz", error);
        toast.error(error?.response?.data?.error || "Failed to load quiz");
        setAssignment(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [assignmentId, authLoading, navigate, user]);

  const kickUser = async (reason) => {
    await recordCheat();
    if (document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.error("Fullscreen exit failed", error);
      }
    }
    sessionStorage.removeItem(`quiz_active_${assignmentId}`);
    toast.error(`Quiz terminated: ${reason}`);
    navigate("/student/community");
  };

  useEffect(() => {
    if (!started) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolation(true);
        kickUser("Tab switching detected");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setViolation(true);
        kickUser("Exited full screen");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("msfullscreenchange", handleFullscreenChange);
    };
  }, [started]);

  useEffect(() => {
    // Screenshot and screen recording protection
    const handleBlur = () => {
      setIsProtecting(true);
      setViolation(true);
      kickUser("Focus lost: Possible screenshot tool or unauthorized action detected");
    };
    const handleFocus = () => setIsProtecting(false);

    const handleKeyDownGlobal = (e) => {
      // Mac screenshot combinations often involve Meta + Shift
      if (e.metaKey && e.shiftKey) {
        setIsProtecting(true);
      }
      if (e.key === "PrintScreen") {
        setIsProtecting(true);
        try { navigator.clipboard.writeText(""); } catch (err) {}
      }
    };

    const handleKeyUpGlobal = (e) => {
      if (e.key === "Meta" || e.key === "Shift" || e.key === "PrintScreen") {
        setTimeout(() => setIsProtecting(false), 1000); 
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("keydown", handleKeyDownGlobal);
    window.addEventListener("keyup", handleKeyUpGlobal);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("keydown", handleKeyDownGlobal);
      window.removeEventListener("keyup", handleKeyUpGlobal);
    };
  }, []);

  const handleStartQuiz = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        await document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen();
      }

      await apiClient.post(`/assignments/${assignmentId}/start`, {});

      sessionStorage.setItem(`quiz_active_${assignmentId}`, "true");
      setStarted(true);
    } catch (error) {
      console.error("Failed to start quiz", error);
      toast.error(error?.response?.data?.error || "Please enable Full Screen to start.");
    }
  };

  const handleSubmit = async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      await apiClient.post(
        `/assignments/${assignmentId}/submit-quiz`,
        {
          assignmentId,
          answers,
          isCheated: false,
          submittedAt: new Date(),
          autoSubmit: auto,
        }
      );

      sessionStorage.removeItem(`quiz_active_${assignmentId}`);
      if (document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch (error) {
          console.error("Fullscreen exit failed", error);
        }
      }

      toast.success("Quiz submitted successfully");
      navigate("/student/community");
    } catch (error) {
      console.error("Quiz submission failed", error);
      toast.error(error?.response?.data?.error || "Failed to submit quiz");
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (loading || !started || !timeRemaining) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, started, timeRemaining]);

  const handleContextMenu = (e) => e.preventDefault();
  const handleKeyDown = (e) => {
    if (
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && e.key === "I") ||
      e.key === "PrintScreen" ||
      (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5" || e.key === "s"))
    ) {
      e.preventDefault();
      try { navigator.clipboard.writeText(""); } catch (err) {}
      setViolation(true);
      kickUser("Security violation detected: Screenshot or DevTools");
    }
  };

  const handleKeyUp = (e) => {
    if (e.key === "PrintScreen") {
      try { navigator.clipboard.writeText(""); } catch (err) {}
      setViolation(true);
      kickUser("Screenshot blocked");
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (loading || authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <LoadingState size="lg" />
      </div>
    );
  }

  if (violation) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center text-white text-center p-8 cursor-none select-none">
        <h2 className="text-4xl font-bold mb-4">Security violation detected</h2>
        <p className="text-lg text-gray-400">Your action has been logged.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 flex-col gap-4 text-center p-8">
        <h2 className="text-3xl font-bold text-gray-800">Quiz completed</h2>
        <p className="text-gray-500 max-w-md">
          You have already submitted this assignment.
        </p>
        <button
          onClick={() => navigate("/student/community")}
          className="mt-6 px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800"
        >
          Back to Community
        </button>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 flex-col gap-4 text-center">
        <h2 className="text-xl font-bold text-gray-800">Failed to load quiz</h2>
        <button onClick={() => window.location.reload()} className="text-blue-500 underline">
          Try Again
        </button>
      </div>
    );
  }

  const questions = Array.isArray(assignment?.content?.questions) && assignment.content.questions.length > 0
    ? assignment.content.questions
    : [];

  return (
    <div
      className="min-h-screen bg-gray-50 select-none overflow-hidden flex flex-col"
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {isProtecting && (
        <div className="fixed inset-0 z-[999999] bg-black pointer-events-none flex items-center justify-center">
          <p className="text-gray-500 font-bold text-xl select-none">Screen capture restricted</p>
        </div>
      )}
      {!started && (
        <div className="fixed inset-0 z-[60] bg-gray-900/95 flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-white p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Secure Quiz Environment</h2>
              <p className="text-gray-500 mt-2">
                This quiz requires full screen mode. Tab switching is prohibited.
              </p>
            </div>
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-left text-sm space-y-1 text-red-700">
              <p>Exiting full screen, switching tabs, or refreshing will terminate the quiz.</p>
            </div>
            <button
              onClick={handleStartQuiz}
              className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-800 transition-all"
            >
              Enter Full Screen and Start
            </button>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{assignment?.title || "Quiz"}</h1>
          <p className="text-xs text-red-500 font-bold">Do not switch tabs or exit full screen.</p>
        </div>
        <div className={`px-4 py-2 rounded-lg font-mono text-xl font-bold ${timeRemaining < 60 ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"}`}>
          {formatTime(timeRemaining)}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        <div className="space-y-6 pb-20">
          {questions.map((q, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg text-gray-800 mb-4">{idx + 1}. {q.question}</h3>
              <div className="space-y-3">
                {(q.options || []).map((opt, optIdx) => (
                  <label
                    key={optIdx}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer hover:bg-gray-50 ${
                      answers[idx] === optIdx
                        ? "border-purple-500 bg-purple-50 hover:bg-purple-50 ring-1 ring-purple-500"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${idx}`}
                      className="w-5 h-5 accent-purple-600"
                      checked={answers[idx] === optIdx}
                      onChange={() => setAnswers((prev) => ({ ...prev, [idx]: optIdx }))}
                    />
                    <span className="text-gray-700 font-medium">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 p-4 sticky bottom-0 z-10 flex justify-end">
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Test"}
        </button>
      </footer>
    </div>
  );
}
