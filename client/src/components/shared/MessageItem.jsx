import React, { useState, useEffect, useRef } from "react";
import SharedNoteBubble from "../SharedNoteBubble";
import LightbulbIcon from "./LightbulbIcon";
import AssignmentMessageCard from "../chat_comps/AssignmentMessageCard";
import { getAvatarUrl } from "../../utils/avatarUtils";
import DocViewer from "../doccomps/docviewer";
import ImagePreviewModal from "../ui/ImagePreviewModal";

const ChevronDown = () => (
    <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-60">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

const MessageItem = ({
    msg,
    currentUser,
    onDelete,
    isTeacherChat,
    onOpenDoubt,
    onViewAssignment,
    isSubmitted,
    onAskQuery,
    role,
    index,
    total,
    isConsecutive,
    isCommunity = false, // Toggle for community specific layout
    showReadReceipt = true,
    disableDeleteActions = false,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [openDocViewer, setOpenDocViewer] = useState(false);
    const [openImageViewer, setOpenImageViewer] = useState(false);
    const menuRef = useRef(null);

    // Strict isMe check: only boolean true should force self-side alignment.
    const currentUserId = currentUser?._id ? String(currentUser._id) : null;
    const senderId =
        msg?.sender?._id ? String(msg.sender._id)
            : typeof msg?.sender === "string" ? msg.sender
                : msg?.senderId ? String(msg.senderId)
                    : null;

    const isMe = (msg.isMe === true) || !!(currentUser && (
        (currentUserId && senderId && senderId === currentUserId) ||
        (msg.sender?.firebaseUid && currentUser?.firebaseUid && msg.sender.firebaseUid === currentUser.firebaseUid)
    ));

    const isNearBottom = index >= total - 3;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target))
                setShowMenu(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Format time
    const timeString = (msg.time || msg.createdAt)
        ? new Date(msg.time || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : "";

    const showProfile = isCommunity && !isMe;

    return (
        <div className={`flex w-full ${isCommunity && isConsecutive ? "mt-0.5" : "mt-2"} ${isMe ? "justify-end" : "justify-start"} items-start gap-2`}>
            {showProfile && (
                <div className="w-7 flex flex-col shrink-0">
                    {!isConsecutive && (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] overflow-hidden border border-gray-100 shadow-sm mt-0.5">
                            <img
                                src={getAvatarUrl(msg.sender?.profile?.avatar || 11)}
                                className="w-full h-full object-cover"
                                alt={msg.sender?.profile?.name}
                                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerText = msg.sender?.profile?.name?.[0] }}
                            />
                        </div>
                    )}
                </div>
            )}

            <div className={`max-w-[75%] flex flex-col relative ${isMe ? "items-end" : "items-start"}`}>
                {showProfile && !msg.isDeleted && !isConsecutive && (
                    <span className="text-[10px] text-gray-500 font-semibold px-1 tracking-wide mb-0.5">
                        {msg.sender?.profile?.name || "User"}
                    </span>
                )}

                <div className="relative flex items-start group/bubble w-fit">
                    <div
                        className={`relative shadow-sm transition-all pb-1
                        ${msg.isDeleted
                                ? "px-4 py-2 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 text-gray-500 italic opacity-80"
                                : msg.type === 'note'
                                    ? "p-0 border-none bg-transparent shadow-none"
                                    : `px-4 py-2 rounded-2xl ${isMe
                                        ? `bg-black text-white ${!isConsecutive ? 'rounded-tr-none' : ''}`
                                        : `bg-white border border-gray-200 text-gray-800 ${!isConsecutive ? 'rounded-tl-none' : ''}`
                                    }`
                            }
                        ${!msg.isDeleted && msg.type !== 'note' ? "group-hover:shadow-md" : ""}
                        `}>
                        {/* CONTENT RENDERER */}
                        {msg.isDeleted ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium">
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-red-500">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                </svg>
                                This message was deleted
                            </span>
                        ) : msg.type === 'note' ? (
                            <SharedNoteBubble
                                message={msg}
                                isMe={isMe}
                                timeString={timeString}
                                isSeen={showReadReceipt && msg.readBy && msg.readBy.filter(id => id !== currentUser?._id).length > 0}
                                showReadReceipt={showReadReceipt}
                            />
                        ) : msg.type === "assignment" ? (
                            <AssignmentMessageCard
                                msg={msg}
                                role={role}
                                isSubmitted={isSubmitted}
                                onViewAssignment={onViewAssignment}
                                onAskQuery={onAskQuery}
                            />
                        ) : msg.type === "image" ? (
                            <div className="flex flex-col gap-2">
                                <img
                                    src={msg.noteData?.url}
                                    alt={msg.noteData?.name || "Shared image"}
                                    className="rounded-lg max-w-[260px] w-full object-cover border border-gray-200 cursor-zoom-in"
                                    onClick={() => setOpenImageViewer(true)}
                                />
                                <div className={`flex items-center justify-end gap-1 text-[10px] ${isMe ? "text-gray-400/80" : "text-gray-400"}`}>
                                    <span>{timeString}</span>
                                    {isMe && showReadReceipt && <LightbulbIcon isSeen={msg.readBy && msg.readBy.filter(id => id !== currentUser?._id).length > 0} />}
                                </div>
                            </div>
                        ) : msg.type === "file" ? (
                            <div className="flex flex-col gap-2 min-w-[180px]">
                                <p className="font-semibold text-xs break-all">{msg.noteData?.name || "Shared file"}</p>
                                <div className="flex items-center gap-3 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setOpenDocViewer(true)}
                                        className="underline"
                                    >
                                        View
                                    </button>
                                    <a
                                        href={msg.noteData?.downloadUrl || msg.noteData?.url}
                                        download={msg.noteData?.name || "file"}
                                        className="underline"
                                    >
                                        Download
                                    </a>
                                </div>
                                <div className={`flex items-center justify-end gap-1 text-[10px] ${isMe ? "text-gray-400/80" : "text-gray-400"}`}>
                                    <span>{timeString}</span>
                                    {isMe && showReadReceipt && <LightbulbIcon isSeen={msg.readBy && msg.readBy.filter(id => id !== currentUser?._id).length > 0} />}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1 min-w-[65px]">
                                {msg.assignmentTitle && (
                                    <div className="text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-wide">
                                        Assignment - {msg.assignmentTitle}
                                    </div>
                                )}
                                {msg.gifUrl && (
                                    <img src={msg.gifUrl} alt="GIF" className="rounded-lg max-w-[200px] w-full object-cover" />
                                )}
                                {msg.text && <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words m-0">{msg.text || msg.content?.text}</p>}

                                {/* TIMESTAMP & READ RECEIPT */}
                                <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? "text-gray-400/80" : "text-gray-400"}`}>
                                    <span>{timeString}</span>
                                    {isMe && showReadReceipt && <LightbulbIcon isSeen={msg.readBy && msg.readBy.filter(id => id !== currentUser?._id).length > 0} />}
                                </div>
                            </div>
                        )}

                        {/* TEACHER/ANNOUNCEMENT ACTIONS */}
                        {isTeacherChat && !msg.isDeleted && msg.type === "announcement" && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                                <button
                                    onClick={() => onOpenDoubt(msg)}
                                    className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-colors">
                                    💬 Discuss / Ask Doubt
                                </button>
                            </div>
                        )}
                    </div>

                    {/* THE OUTSIDE DROPDOWN MENU */}
                    {!msg.isDeleted && !disableDeleteActions && (!isCommunity || isMe) && (
                        <div className={`absolute top-0 h-full flex items-start px-2 opacity-0 group-hover/bubble:opacity-100 transition-opacity
                                ${isMe ? "right-[100%] flex-row-reverse" : "left-[100%] flex-row"}
                                `}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-black transition-colors mt-0.5"
                            >
                                <ChevronDown />
                            </button>

                            {showMenu && (
                                <div ref={menuRef} className={`absolute z-[100] w-36 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-100 
                                        ${isMe ? "right-2" : "left-2"}
                                        ${isNearBottom ? "bottom-full mb-1 origin-bottom" : "top-8 origin-top"}
                                        `}>
                                    {isMe && (
                                        <button
                                            onClick={() => onDelete(msg._id, "everyone")}
                                            className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 font-medium border-b border-gray-50">
                                            Delete for everyone
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onDelete(msg._id, "me")}
                                        className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 font-medium">
                                        Delete for me
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {msg.type === "file" && openDocViewer && (
                <DocViewer
                    file={{
                        name: msg.noteData?.name || "Shared file",
                        type: msg.noteData?.type || "application/octet-stream",
                        url: msg.noteData?.url || "",
                        downloadUrl: msg.noteData?.downloadUrl || msg.noteData?.url || "",
                        previewUrl: msg.noteData?.previewUrl || null,
                        previewType: msg.noteData?.previewType || null,
                        previewStatus: msg.noteData?.previewStatus || null,
                        previewError: msg.noteData?.previewError || null,
                    }}
                    onClose={() => setOpenDocViewer(false)}
                />
            )}

            {msg.type === "image" && (
                <ImagePreviewModal
                    isOpen={openImageViewer}
                    onClose={() => setOpenImageViewer(false)}
                    imageUrl={msg.noteData?.url}
                    imageName={msg.noteData?.name || "Shared image"}
                />
            )}
        </div>
    );
};

export default MessageItem;
