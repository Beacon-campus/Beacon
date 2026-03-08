import React from "react";

export default function AssignmentMessageCard({
  msg,
  role,
  isSubmitted,
  onViewAssignment,
  onAskQuery,
  isMe,
  isConsecutive,
  timeString,
  showReadReceipt,
  currentUser
}) {
  const assignmentId = msg.assignmentId?._id || msg.assignmentId;
  const assignmentType = msg.assignmentId?.type;
  const title = msg.assignmentId?.title || (msg.text || "").replace("New Assignment: ", "") || "Assignment";

  return (
    <div className={`min-w-[260px] overflow-hidden rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-amber-200 bg-[#FEFCE8] p-4 text-[#0F172A] ${isMe ? (!isConsecutive ? 'rounded-br-[2px]' : '') : (!isConsecutive ? 'rounded-bl-[2px]' : '')}`}>
      <div className="mb-3 flex items-center justify-between gap-2 w-full">
        <span className="rounded border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 w-fit shrink-0">
          {assignmentType === "offline" ? "Offline" : assignmentType === "quiz" ? "Quiz" : "QnA"}
        </span>
        {role === "student" && isSubmitted && (
          <span className="rounded bg-[#059669] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm shrink-0">
            Submitted
          </span>
        )}
      </div>

      <p className="mb-3 text-[14px] font-bold leading-[1.4] pr-2">{title}</p>

      <div className="flex flex-wrap gap-2 mt-1">
        <button
          type="button"
          onClick={() => onViewAssignment(assignmentId, "details")}
          className="rounded-lg bg-[#0F172A] px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-white hover:bg-gray-800 transition-colors shadow-sm"
        >
          View
        </button>

        {role === "student" && (
          <button
            type="button"
            onClick={() => onAskQuery(assignmentId, "queries")}
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-gray-700 hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap"
          >
            Query
          </button>
        )}

        {role === "student" && !isSubmitted && (assignmentType === "qna" || !assignmentType) && (
          <button
            type="button"
            onClick={() => onViewAssignment(assignmentId, "details")}
            className="rounded-lg border border-blue-300 bg-blue-50 px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-blue-700 hover:bg-blue-100 transition-colors shadow-sm whitespace-nowrap"
          >
            Upload
          </button>
        )}
      </div>

      <div className="flex items-center justify-end gap-[3px] opacity-70 select-none w-full mt-2 -mb-1 min-w-max">
        <span className="text-[10px] text-[#D97706] font-bold tracking-wide">
          {timeString}
        </span>
      </div>

    </div>
  );
}
