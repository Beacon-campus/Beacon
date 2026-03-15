import React, { useState, useEffect, useRef } from "react";
import SharedNoteBubble from "../SharedNoteBubble";
import LightbulbIcon from "./LightbulbIcon";
import AssignmentMessageCard from "../chat_comps/AssignmentMessageCard";
import { getAvatarUrl } from "../../utils/avatarUtils";
import DocViewer from "../doccomps/docviewer";
import ImagePreviewModal from "../ui/ImagePreviewModal";
import { resolveAttachmentUrl } from "../../utils/cloudinaryUrl";

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
        ? new Date(msg.time || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        : "";

    const showProfile = isCommunity && !isMe;

    return (
        <div className={`flex w-full ${isMe ? "justify-end" : "justify-start"} items-start gap-2`}>
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
                                    : (msg.type === 'image' || msg.type === 'file' || msg.type === 'assignment')
                                        ? "p-0 bg-transparent shadow-none"
                                    : `px-[14px] py-[8px] min-h-[36px] flex flex-col justify-center rounded-[20px] ${isMe
                                        ? `bg-[#F0FDF4] text-[#0F172A] ${!isConsecutive ? 'rounded-br-[2px]' : ''}`
                                        : `bg-[#F3F4F6] shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-black/5 text-gray-800 ${!isConsecutive ? 'rounded-bl-[2px]' : ''}`
                                    }`
                            }
                        ${!msg.isDeleted && msg.type !== 'note' && msg.type !== 'image' && msg.type !== 'file' && msg.type !== 'assignment' ? "group-hover/bubble:shadow-md" : ""}
                        `}>
                        {/* THE INSIDE DROPDOWN MENU */}
                        {!msg.isDeleted && !disableDeleteActions && (!isCommunity || isMe) && (
                            <div className="absolute top-1.5 right-1.5 z-[20] opacity-0 group-hover/bubble:opacity-100 transition-opacity flex flex-col items-end">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                    className="p-1 rounded-full bg-white/10 hover:bg-gray-200/50 text-gray-400 hover:text-black transition-colors"
                                >
                                    <ChevronDown />
                                </button>

                                {showMenu && (
                                    <div ref={menuRef} className={`absolute top-full mt-1 w-36 bg-white rounded-xl shadow-2xl border border-gray-100/50 overflow-hidden animate-in zoom-in-95 duration-100 origin-top-right z-[100]
                                            ${isNearBottom ? "bottom-full top-auto mb-1 origin-bottom-right" : ""}
                                            `}>
                                        {isMe && (
                                            <button
                                                onClick={() => onDelete(msg._id, "everyone")}
                                                className="w-full text-left px-4 py-2.5 text-[11px] text-gray-600 hover:text-red-600 hover:bg-red-50 font-bold border-b border-gray-50 flex items-center gap-2 transition-colors">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                Delete for everyone
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onDelete(msg._id, "me")}
                                            className="w-full text-left px-4 py-2.5 text-[11px] text-gray-600 hover:bg-gray-50 font-bold flex items-center gap-2 transition-colors">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                            Delete for me
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* CONTENT RENDERER */}
                        {msg.isDeleted ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
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
                                isMe={isMe}
                                isConsecutive={isConsecutive}
                                timeString={timeString}
                                showReadReceipt={showReadReceipt}
                                currentUser={currentUser}
                            />
                        ) : msg.type === "image" ? (
                            <img
                                src={resolveAttachmentUrl(msg.noteData)}
                                alt={msg.noteData?.name || "Shared image"}
                                className={`rounded-2xl max-w-[260px] w-full object-cover shadow-sm cursor-zoom-in ${isMe && !isConsecutive ? 'rounded-br-sm' : ''} ${!isMe && !isConsecutive ? 'rounded-bl-sm' : ''}`}
                                onClick={() => setOpenImageViewer(true)}
                            />
                        ) : msg.type === "file" ? (
                            <div className={`flex items-center gap-3 p-3 bg-white border border-gray-200 shadow-sm min-w-[220px] max-w-[260px] cursor-pointer hover:bg-gray-50 transition-colors rounded-xl ${isMe && !isConsecutive ? 'rounded-br-[4px]' : ''} ${!isMe && !isConsecutive ? 'rounded-bl-[4px]' : ''}`} onClick={() => setOpenDocViewer(true)}>
                                <div className="w-10 h-10 rounded-lg bg-red-50 flex flex-shrink-0 items-center justify-center text-red-500">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-800 truncate">{msg.noteData?.name?.replace(/^[0-9]+-[0-9a-fA-F-]+-/, '') || "Shared file"}</p>
                                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">Click to view</p>
                                </div>
                                <a href={resolveAttachmentUrl(msg.noteData) || ""} download={msg.noteData?.name || "file"} onClick={(e) => e.stopPropagation()} className="p-2 bg-gray-50 hover:bg-gray-200 rounded-full text-gray-600 transition-colors shrink-0">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                </a>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {msg.assignmentTitle && (
                                    <div className="text-[10.5px] font-[800] text-gray-500 mb-2 uppercase tracking-wide opacity-90">
                                        Assignment - {msg.assignmentTitle}
                                    </div>
                                )}
                                {msg.gifUrl && (
                                    <img src={msg.gifUrl} alt="GIF" className="rounded-lg mb-2 max-w-[200px] w-full object-cover" />
                                )}
                                {msg.text && (
                                    <div className="flex items-end gap-[8px]">
                                        <p className="text-[14.5px] leading-[1.6] whitespace-pre-wrap break-words m-0 relative z-10 text-left pt-[2px] w-full">{msg.text || msg.content?.text}</p>
                                        
                                        <div className={`flex items-center justify-end gap-[3px] opacity-70 select-none shrink-0 mb-[-2px] min-w-max`}>
                                            <span className="text-[10px] text-[#6B7280] font-bold tracking-wide translate-y-[0.5px]">
                                                {timeString}
                                            </span>
                                            {isMe && showReadReceipt && (
                                                <LightbulbIcon isSeen={msg.readBy && msg.readBy.filter(id => id !== currentUser?._id).length > 0} />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TIMESTAMP FOR NON-TEXT MESSAGES OR MEDIA (FALLBACK) */}
                        {(!msg.text || msg.type === 'image' || msg.type === 'file') && timeString && !msg.isDeleted && msg.type !== 'note' && msg.type !== 'assignment' && (
                            <div className={`flex items-center gap-1 opacity-70 select-none ${
                                (msg.type === 'image' || msg.type === 'file') ? 'justify-end mt-1.5 w-full text-[#6B7280]' : 'justify-end mt-1 -mb-1 -mr-1'
                            }`}>
                                <span className="text-[10px] font-bold tracking-wide text-[#6B7280] translate-y-[0.5px]">
                                    {timeString}
                                </span>
                                {isMe && showReadReceipt && (
                                    <LightbulbIcon 
                                        isSeen={msg.readBy && msg.readBy.filter(id => id !== currentUser?._id).length > 0} 
                                    />
                                )}
                            </div>
                        )}

                        {/* TEACHER/ANNOUNCEMENT ACTIONS */}
                        {isTeacherChat && !msg.isDeleted && msg.type === "announcement" && (
                            <div className="mt-2 pt-2 border-t border-black/5">
                                <button
                                    onClick={() => onOpenDoubt(msg)}
                                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 transition-colors">
                                    💬 Discuss / Ask Doubt
                                </button>
                            </div>
                        )}
                    </div>


                </div>
            </div>

            {msg.type === "file" && openDocViewer && (
                <DocViewer
                    file={{
                        ...msg.noteData,
                        name: msg.noteData?.name || "Shared file",
                        mimeType: msg.noteData?.mimeType || msg.noteData?.type || "application/octet-stream",
                        type: msg.noteData?.mimeType || msg.noteData?.type || "application/octet-stream",
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
                    imageUrl={resolveAttachmentUrl(msg.noteData)}
                    imageName={msg.noteData?.name || "Shared image"}
                />
            )}
        </div>
    );
};

export default MessageItem;
