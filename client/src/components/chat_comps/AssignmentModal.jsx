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
        <div className="flex h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="z-10 shrink-0 border-b border-gray-100 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="line-clamp-1 text-lg font-bold text-gray-800">{assignment?.title || "Loading..."}</h3>
                <span className="mt-1 inline-block rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-700">
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
              className={`flex-1 border-b-2 py-3 text-sm font-bold transition-colors ${assignmentTab === "details" ? "border-black bg-white text-black" : "border-transparent text-gray-500 hover:bg-gray-100"}`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setAssignmentTab("queries")}
              className={`flex-1 border-b-2 py-3 text-sm font-bold transition-colors ${assignmentTab === "queries" ? "border-black bg-white text-black" : "border-transparent text-gray-500 hover:bg-gray-100"}`}
            >
              Queries
            </button>
          </div>

          {assignmentTab === "details" ? (
            <div className="flex-1 overflow-y-auto p-6">
              <h4 className="mb-2 font-bold text-gray-700">Instructions</h4>
              <p className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                {assignment?.instructions || "No instructions provided."}
              </p>

              {assignment?.type === "offline" && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
                  Students submit this assignment physically.
                </div>
              )}

              {assignment?.type === "quiz" && role === "student" && (
                <div className="rounded-xl border-2 border-dashed border-purple-200 bg-purple-50 p-5">
                  <div className="mb-3 text-sm font-bold text-purple-800">Quiz Assignment</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQuizRules(true)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold ${quizRulesAccepted ? "border-green-200 bg-green-100 text-green-700" : "border-purple-200 bg-white text-purple-700"}`}
                    >
                      {quizRulesAccepted ? "Rules Accepted" : "Read Rules"}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(`/student/quiz/${assignment?._id}`, "_blank")}
                      disabled={!quizRulesAccepted}
                      className="flex-1 rounded-lg bg-black px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
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
            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-gray-50 p-4">
              <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200">
                Close
              </button>
              {(assignment?.type === "qna" || !assignment?.type) && role === "student" && !submitted && (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!submissionFile || isSubmitting}
                  className="rounded-xl bg-black px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-black/20 disabled:opacity-50"
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
            <div className="mb-5 space-y-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              <p>1. Stay in fullscreen while taking quiz.</p>
              <p>2. Tab switching may reset and flag attempt.</p>
              <p>3. Shortcuts/copy actions can be blocked.</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowQuizRules(false)} className="flex-1 rounded-xl py-3 text-sm font-bold text-gray-500 hover:bg-gray-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuizRulesAccepted(true);
                  setShowQuizRules(false);
                }}
                className="flex-1 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white hover:bg-purple-700"
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
