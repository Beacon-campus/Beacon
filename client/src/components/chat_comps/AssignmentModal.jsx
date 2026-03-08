import React, { useRef, useState } from "react";
import SendIcon from "../../assets/send.svg";

export default function AssignmentModal({
  isOpen,
  assignment,
  role,
  assignmentTab,
  setAssignmentTab,
  submitted,
  submissionFile,
  onFileChange,
  onClose,
  onSubmit,
  isSubmitting,
  doubtsFeed,
  doubtInput,
  setDoubtInput,
  onSendDoubt,
  isSendingDoubt,
}) {
  const [showQuizRules, setShowQuizRules] = useState(false);
  const [quizRulesAccepted, setQuizRulesAccepted] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="z-10 shrink-0 border-b border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="line-clamp-1 text-lg font-bold text-gray-800">{assignment?.title || "Loading..."}</h3>
                <span className="inline-block rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-700">
                  {assignment?.type || "qna"}
                </span>
              </div>
              <button type="button" onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-black">
                &times;
              </button>
            </div>
          </div>

          <div className="flex shrink-0 border-b border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={() => setAssignmentTab("details")}
              className={`flex-1 relative py-3.5 text-sm font-bold transition-all ${assignmentTab === "details" ? "text-[#0F172A]" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100/50"}`}
            >
              Details
              {assignmentTab === "details" && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-12 bg-[#0F172A] rounded-t-sm" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setAssignmentTab("queries")}
              className={`flex-1 relative py-3.5 text-sm font-bold transition-all ${assignmentTab === "queries" ? "text-[#0F172A]" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100/50"}`}
            >
              Queries
              {assignmentTab === "queries" && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-12 bg-[#0F172A] rounded-t-sm" />
              )}
            </button>
          </div>

          {assignmentTab === "details" ? (
            <div className="flex-1 overflow-y-auto p-6">
              <h4 className="mb-2 font-bold text-gray-500">Instructions</h4>
              <p className="mb-6 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-700">
                {assignment?.instructions || "No instructions provided."}
              </p>

              {assignment?.type === "offline" && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
                  Students submit this assignment physically.
                </div>
              )}

              {assignment?.type === "quiz" && role === "student" && (
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-5 shadow-sm">
                  <div className="mb-3 text-[13px] font-bold text-gray-700 uppercase tracking-wide">Quiz Assignment</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQuizRules(true)}
                      className={`flex-1 rounded-xl border-2 px-3 py-2 text-xs font-bold transition-colors ${quizRulesAccepted ? "border-green-500 text-green-700 bg-green-50" : "border-gray-200 bg-transparent text-gray-600 hover:bg-gray-100"}`}
                    >
                      {quizRulesAccepted ? "Rules Accepted ✓" : "Read Rules"}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(`/student/quiz/${assignment?._id}`, "_blank")}
                      disabled={!quizRulesAccepted}
                      className="flex-1 rounded-xl bg-[#0F172A] px-3 py-2 text-xs font-bold tracking-wide text-white transition-all hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-[#0F172A]"
                    >
                      Start Quiz
                    </button>
                  </div>
                </div>
              )}

              {(assignment?.type === "qna" || !assignment?.type) && role === "student" && !submitted && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h4 className="mb-3 text-sm font-bold text-gray-700">Submit Work</h4>
                  {!submissionFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-6 text-center text-xs text-gray-500 hover:bg-gray-100"
                    >
                      Click to attach file
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-bold">{submissionFile.name}</p>
                        <p className="text-xs text-gray-400">{(submissionFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" onChange={onFileChange} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden bg-gray-50">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-bold text-gray-700">My Doubts</p>
                  {(doubtsFeed?.personalDoubts || []).length === 0 ? (
                    <p className="mt-1 text-xs text-gray-500">You have not asked any doubt yet.</p>
                  ) : (
                    <div className="mt-2 space-y-3">
                      {(doubtsFeed?.personalDoubts || []).map((d) => (
                        <div key={d._id} className="rounded border border-gray-100 p-2">
                          <p className="text-xs font-medium text-gray-700">{d.text}</p>
                          <div className="mt-2 space-y-1">
                            {(d.replies || []).map((r, idx) => (
                              <p key={`${d._id}_${idx}`} className="rounded bg-gray-50 p-1.5 text-xs text-gray-600">
                                Reply ({r.mode || "private"}): {r.text}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                  <p className="text-xs font-bold text-indigo-800">Teacher Broadcast Replies</p>
                  {(doubtsFeed?.broadcastReplies || []).length === 0 ? (
                    <p className="mt-1 text-xs text-indigo-700/80">No broadcast replies yet.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {(doubtsFeed?.broadcastReplies || []).map((r) => (
                        <div key={r._id} className="rounded border border-indigo-100 bg-white p-2">
                          <p className="text-xs text-gray-700">{r.text}</p>
                          <p className="mt-1 text-[10px] text-gray-500">
                            {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {role === "student" ? (
                <div className="flex shrink-0 gap-2 border-t border-gray-100 bg-white p-3">
                  <input
                    value={doubtInput}
                    onChange={(e) => setDoubtInput(e.target.value)}
                    className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm"
                    placeholder="Type your doubt..."
                  />
                  <button
                    type="button"
                    onClick={onSendDoubt}
                    disabled={!doubtInput.trim() || isSendingDoubt}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black disabled:bg-gray-300"
                  >
                    <img src={SendIcon} className="h-4 w-4 invert" alt="send" />
                  </button>
                </div>
              ) : (
                <div className="shrink-0 border-t border-gray-100 bg-white p-3 text-xs text-gray-500">
                  Students can ask doubts from this tab.
                </div>
              )}
            </div>
          )}

          {assignmentTab === "details" && (
            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white p-5">
              <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                Close
              </button>
              {(assignment?.type === "qna" || !assignment?.type) && role === "student" && !submitted && (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!submissionFile || isSubmitting}
                  className="rounded-xl bg-[#0F172A] px-6 py-2.5 text-sm font-bold tracking-wide text-white shadow-md disabled:opacity-50 transition-all hover:bg-gray-800"
                >
                  {isSubmitting ? "Submitting..." : "Submit Assignment"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showQuizRules && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-3 text-xl font-bold text-gray-800">Quiz Rules</h3>
            <div className="mb-5 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">⚠️ Important Instructions:</p>
              <ul className="list-disc pl-5 space-y-1 opacity-90 mt-2">
                <li>Stay in fullscreen while taking quiz.</li>
                <li>Tab switching may reset and flag attempt.</li>
                <li>Shortcuts/copy actions can be blocked.</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowQuizRules(false)} className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuizRulesAccepted(true);
                  setShowQuizRules(false);
                }}
                className="flex-1 rounded-xl bg-[#0F172A] py-3 text-sm font-bold tracking-wide text-white hover:bg-gray-800 transition-colors shadow-md"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
