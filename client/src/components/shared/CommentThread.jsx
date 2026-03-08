import React from "react";
import { getAvatarUrl } from "../../utils/avatarUtils";

const CommentThread = ({ comment, onReply, depth = 0 }) => {
    const isTeacher = comment.userId?.role === "teacher";

    return (
        <div className={`flex flex-col ${depth > 0 ? "ml-4 pl-4 border-l-2 border-gray-100 mt-3" : "mt-4"}`}>
            <div className={`flex gap-3 p-3 rounded-xl transition-colors ${isTeacher ? "bg-blue-50 border border-blue-100" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border ${isTeacher ? "bg-blue-600 text-white border-blue-200" : "bg-gray-100 text-gray-600 border-gray-100"
                    }`}>
                    <img
                        src={getAvatarUrl(comment.userId?.profile?.avatar || comment.userAvatar || (isTeacher ? 1 : 11))}
                        className="w-full h-full object-cover"
                        alt={comment.userName}
                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerText = comment.userName?.[0] }}
                    />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isTeacher ? "text-blue-700" : "text-gray-900"}`}>
                            {comment.userName}
                            {isTeacher && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">TEACHER</span>}
                        </span>
                        <span className="text-[10px] text-gray-400">
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{comment.content}</p>

                    <div className="flex gap-4 mt-2">
                        <button
                            onClick={() => onReply(comment)}
                            className="text-xs font-semibold text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2-2z"></path></svg>
                            Reply
                        </button>
                    </div>
                </div>
            </div>

            {/* Recursive Children */}
            {comment.children && comment.children.length > 0 && (
                <div className="w-full">
                    {comment.children.map((child, idx) => (
                        <CommentThread key={child._id || idx} comment={child} onReply={onReply} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentThread;
