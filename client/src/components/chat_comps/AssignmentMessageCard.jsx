import React from "react";

export default function AssignmentMessageCard({
  msg,
  role,
  isSubmitted,
  onViewAssignment,
  onAskQuery,
}) {
  const assignmentId = msg.assignmentId?._id || msg.assignmentId;
  const assignmentType = msg.assignmentId?.type;
  const title = msg.assignmentId?.title || (msg.text || "").replace("New Assignment: ", "") || "Assignment";

  return (
    <div className="min-w-[260px] rounded-xl border border-amber-200 bg-amber-50 p-3 text-gray-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
          {assignmentType === "offline" ? "Offline" : assignmentType === "quiz" ? "Quiz" : "QnA"}
        </span>
        {role === "student" && isSubmitted && (
          <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
            Submitted
          </span>
        )}
      </div>

      <p className="mb-3 text-sm font-semibold leading-snug">{title}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onViewAssignment(assignmentId, "details")}
          className="rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800"
        >
          View
        </button>

        {role === "student" && (
          <button
            type="button"
            onClick={() => onAskQuery(assignmentId, "queries")}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
          >
            Query
          </button>
        )}

        {role === "student" && !isSubmitted && (assignmentType === "qna" || !assignmentType) && (
          <button
            type="button"
            onClick={() => onViewAssignment(assignmentId, "details")}
            className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
          >
            Upload
          </button>
        )}
      </div>
    </div>
  );
}
