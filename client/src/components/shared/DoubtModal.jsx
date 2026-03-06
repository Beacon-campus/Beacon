import React from "react";
import CommentThread from "./CommentThread";

export default function DoubtModal({
    isOpen,
    onClose,
    activeAnnouncement,
    doubts,
    replyToComment,
    setReplyToComment,
    doubtInput,
    setDoubtInput,
    onSendDoubt,
    doubtInputRef
}) {
    if (!isOpen) return null;

    // --- TREE BUILDER HELPER ---
    const buildCommentTree = (comments) => {
        const map = {};
        const roots = [];

        // 1. Initialize map
        comments.forEach(c => {
            map[c._id] = { ...c, children: [] };
        });

        // 2. Connect children
        comments.forEach(c => {
            if (c.replyTo && map[c.replyTo]) {
                map[c.replyTo].children.push(map[c._id]);
            } else {
                roots.push(map[c._id]);
            }
        });

        return roots;
    };

    const handleReply = (comment) => {
        setReplyToComment(comment);
        setTimeout(() => doubtInputRef.current?.focus(), 100);
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-left">
            <div className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 bg-gray-50 shrink-0">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                                OFFICIAL POST
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-red-500 text-xl font-bold">
                            &times;
                        </button>
                    </div>
                    <h3 className="font-semibold text-gray-800 text-lg leading-snug">
                        {activeAnnouncement?.content || activeAnnouncement?.text}
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-0 bg-white">
                    {doubts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
                            <span className="text-4xl">💬</span>
                            <p className="text-sm">No discussions yet.</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            {buildCommentTree(doubts).map((root, idx) => (
                                <CommentThread key={root._id || idx} comment={root} onReply={handleReply} />
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                    {replyToComment && (
                        <div className="flex justify-between items-center mb-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600">
                            <div className="flex items-center gap-2">
                                <span className="font-bold">Replying to:</span>
                                <span>{replyToComment.userName}</span>
                            </div>
                            <button onClick={() => setReplyToComment(null)} className="text-gray-400 hover:text-black font-bold text-lg leading-none">&times;</button>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <textarea
                            ref={doubtInputRef}
                            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/5"
                            rows="1"
                            placeholder="Reply..."
                            value={doubtInput}
                            onChange={(e) => setDoubtInput(e.target.value)}
                        />
                        <button
                            onClick={onSendDoubt}
                            className="bg-black text-white px-5 rounded-xl text-sm font-bold">
                            Post
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
