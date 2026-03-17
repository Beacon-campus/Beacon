import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useProject } from "../../context/ProjectContext";
import socket from "../../services/socket.service";
import profanityFilter from "../../utils/profanityFilter";
import { auth } from "../../firebase/firebase";
import ChatMediaPicker from "../chat_comps/ChatMediaPicker";
import MessageItem from "../shared/MessageItem";
import { toast } from "react-hot-toast";
import { ACCEPTED_ATTACHMENT_EXTENSIONS, uploadAttachment } from "../../utils/attachmentUpload";
import axios from "axios";
import { server } from "../../main";
import { useCallback } from "react";
import LoadingState from "../ui/LoadingState";

export default function GroupChatWindow({
    groupId,
    messages,
    group,
    hasMoreOlder = false,
    isLoadingOlder = false,
    onLoadOlder,
}) {
    const formatScrollDateLabel = (value) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        if (dayStart.getTime() === today.getTime()) return "Today";
        if (dayStart.getTime() === yesterday.getTime()) return "Yesterday";
        return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    };

    const { user: currentUser } = useAuth();
    const { fetchGroupMessages } = useProject();
    const [newMessage, setNewMessage] = useState("");

    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [selectedGif, setSelectedGif] = useState(null);
    const [selectedAttachment, setSelectedAttachment] = useState(null);
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
    const [showDateBadge, setShowDateBadge] = useState(false);
    const [dateBadgeText, setDateBadgeText] = useState("");
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const isFetchingOlderRef = useRef(false);
    const hideDateBadgeTimeoutRef = useRef(null);
    const uploadInputRef = useRef(null);

    const isGroupExpired = useMemo(() => {
        if (!group?.deadline) return false;
        const deadlineDate = new Date(group.deadline);
        if (Number.isNaN(deadlineDate.getTime())) return false;
        deadlineDate.setHours(23, 59, 59, 999);
        return new Date() > deadlineDate;
    }, [group?.deadline]);

    useEffect(() => {
        if (groupId) fetchGroupMessages(groupId);
    }, [groupId, fetchGroupMessages]);

    useEffect(() => {
        if (groupId) {
            socket.emit("join_room", groupId);
        }
    }, [groupId]);

    useEffect(() => {
        const scrollToBottom = () => {
            if (messagesEndRef.current?.parentElement) {
              messagesEndRef.current.parentElement.scrollTo({
                top: messagesEndRef.current.parentElement.scrollHeight,
                behavior: "smooth"
              });
            }
        };
        scrollToBottom();
        const timeoutId = setTimeout(scrollToBottom, 300);
        return () => clearTimeout(timeoutId);
    }, [messages]);

    const handleGifSelect = (gifUrl) => {
        setSelectedGif(gifUrl);
        setShowMediaPicker(false);
    };

    const handleEmojiSelect = (emoji) => {
        setNewMessage(prev => prev + emoji);
    };

    const handleSend = (e) => {
        if (e) e.preventDefault();
        if (isGroupExpired) {
            toast.error("This group has expired. Messaging is disabled.");
            return;
        }
        if ((!newMessage.trim() && !selectedGif && !selectedAttachment) || !currentUser || isUploadingAttachment) return;

        let text = newMessage.trim();
        if (text && profanityFilter.isProfane(text)) text = profanityFilter.clean(text);

        const customId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

        const payload = {
            channelId: groupId,
            text: selectedAttachment ? (text || selectedAttachment.name || "") : text,
            gifUrl: selectedGif,
            senderId: currentUser._id,
            senderProfile: currentUser.profile,
            firebaseUid: auth.currentUser?.uid,
            type: selectedAttachment?.kind || "text",
            noteData: selectedAttachment
                ? {
                    type: "file",
                    name: selectedAttachment.name,
                    mimeType: selectedAttachment.mimeType || selectedAttachment.type,
                    size: selectedAttachment.size,
                    cloudinary: selectedAttachment.cloudinary || null,
                    previewUrl: selectedAttachment.previewUrl || null,
                    previewDownloadUrl: selectedAttachment.previewDownloadUrl || null,
                    previewPath: selectedAttachment.previewPath || null,
                    previewType: selectedAttachment.previewType || null,
                    previewStatus: selectedAttachment.previewStatus || null,
                    previewError: selectedAttachment.previewError || null,
                }
                : null,
            customId
        };

        socket.emit("send_message", payload);
        setNewMessage("");
        setSelectedGif(null);
        setSelectedAttachment(null);

        setTimeout(() => {
            fetchGroupMessages(groupId, true);
        }, 1000);
    };

    const handleDeleteMessage = useCallback(async (messageId, type) => {
        try {
            const token = await auth.currentUser.getIdToken();
            if (type === "me") {
                // Optimistically update UI if Delete for Me
                // (though socket will also handle it, this is faster)
                // ProjectContext handles local message lists
            }
            await axios.put(
                `${server}/chat/message/delete`,
                { messageId, type },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Message deleted");
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("Failed to delete message");
        }
    }, []);

    useEffect(() => {
        const handleSendError = (payload) => {
            if (!payload || payload.channelId !== groupId) return;
            if (payload.code === "GROUP_EXPIRED") {
                toast.error(payload.message || "This group has expired. Messaging is disabled.");
            }
        };
        socket.on("send_error", handleSendError);
        return () => socket.off("send_error", handleSendError);
    }, [groupId]);

    const handlePickUpload = () => uploadInputRef.current?.click();

    const handleUploadSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIsUploadingAttachment(true);
            const uploaded = await uploadAttachment(file, "group");
            setSelectedAttachment(uploaded);
            toast.success("File attached");
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message || "Failed to upload file");
        } finally {
            setIsUploadingAttachment(false);
            if (uploadInputRef.current) uploadInputRef.current.value = "";
        }
    };

    const handleScroll = async (e) => {
        const container = e.target;
        const dateNodes = container.querySelectorAll("[data-message-date]");
        for (const node of dateNodes) {
            const rect = node.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            if (rect.bottom > containerRect.top + 20) {
                const nextLabel = formatScrollDateLabel(node.getAttribute("data-message-date"));
                if (nextLabel) {
                    setDateBadgeText(nextLabel);
                    setShowDateBadge(true);
                }
                break;
            }
        }
        if (hideDateBadgeTimeoutRef.current) clearTimeout(hideDateBadgeTimeoutRef.current);
        hideDateBadgeTimeoutRef.current = setTimeout(() => setShowDateBadge(false), 5000);

        if (container.scrollTop < 80 && hasMoreOlder && !isLoadingOlder && !isFetchingOlderRef.current && onLoadOlder) {
            isFetchingOlderRef.current = true;
            const prevHeight = container.scrollHeight;
            const prevTop = container.scrollTop;
            const loadedCount = await onLoadOlder();
            if (loadedCount > 0) {
                toast.success(`Loaded ${loadedCount} older messages`, { id: `older-${groupId || "group"}` });
            }
            requestAnimationFrame(() => {
                const el = scrollContainerRef.current;
                if (el && loadedCount > 0) {
                    const newHeight = el.scrollHeight;
                    el.scrollTop = Math.max(0, newHeight - prevHeight + prevTop);
                }
                isFetchingOlderRef.current = false;
            });
        }
    };

    useEffect(() => {
        return () => {
            if (hideDateBadgeTimeoutRef.current) clearTimeout(hideDateBadgeTimeoutRef.current);
        };
    }, []);

    return (
        <div className="flex-1 flex flex-col bg-gray-50/30 overflow-hidden relative">
            {showDateBadge && dateBadgeText && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-full border border-black/10 bg-white/95 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-700 shadow">
                    {dateBadgeText}
                </div>
            )}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 flex flex-col no-scrollbar" onScroll={handleScroll}>
                {isLoadingOlder && (
                    <div className="text-center text-[10px] uppercase tracking-widest font-bold text-gray-400 py-2 flex items-center justify-center">
                        <LoadingState size="xs" />
                    </div>
                )}
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-gray-400 flex items-center justify-center text-xl font-black">?</div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-2">No messages yet.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
                        const getId = (m) => m?.sender?._id || m?.senderId || (typeof m?.sender === "string" ? m.sender : null);
                        const currentSenderId = getId(msg);
                        const prevSenderId = getId(prevMsg);
                        const nextSenderId = getId(nextMsg);
                        const isConsecutive = prevMsg && prevSenderId === currentSenderId;
                        const isLastInStack = !nextMsg || nextSenderId !== currentSenderId;

                        return (
                            <div key={msg._id || idx} data-message-date={msg?.createdAt || msg?.sentAt || ""} className={`${!isConsecutive && idx !== 0 ? 'mt-6' : 'mt-1'}`}>
                                <MessageItem
                                    msg={msg}
                                    currentUser={currentUser}
                                    role="student"
                                    index={idx}
                                    total={messages.length}
                                    isCommunity={true}
                                    isConsecutive={isConsecutive}
                                    isLastInStack={isLastInStack}
                                    showReadReceipt={false}
                                    onDelete={handleDeleteMessage}
                                />
                            </div>
                        );
                    })
                )}
                <div className="pb-4" ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                <div className="flex flex-col gap-2 relative w-full max-w-5xl mx-auto">
                    {selectedGif && (
                        <div className="relative w-fit mb-2">
                            <img src={selectedGif} alt="GIF Preview" className="h-24 rounded-lg border border-gray-200" />
                            <button onClick={() => setSelectedGif(null)} className="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold ring-2 ring-white hover:bg-gray-800">&times;</button>
                        </div>
                    )}
                    {selectedAttachment && (
                        <div className="relative w-fit mb-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                            <p className="font-semibold truncate max-w-[220px]">{selectedAttachment.name}</p>
                            <button onClick={() => setSelectedAttachment(null)} className="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold ring-2 ring-white hover:bg-gray-800">&times;</button>
                        </div>
                    )}
                    {isUploadingAttachment && <p className="text-xs text-gray-500 font-semibold">Uploading attachment...</p>}

                    <div className="flex items-center gap-3 relative">
                        <input
                            ref={uploadInputRef}
                            type="file"
                            className="hidden"
                            accept={ACCEPTED_ATTACHMENT_EXTENSIONS}
                            onChange={handleUploadSelected}
                        />
                        <button onClick={handlePickUpload} disabled={isGroupExpired} className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="Attach document/image">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                                <path d="M13.5 3H12H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H12M13.5 3L19 8.625M13.5 3V7.625C13.5 8.17728 13.9477 8.625 14.5 8.625H19M19 8.625V11.8125" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M17.5 21L17.5 15M17.5 15L20 17.5M17.5 15L15 17.5" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <div className="relative">
                            <button onClick={() => setShowMediaPicker(!showMediaPicker)} disabled={isGroupExpired} className={`p-2 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${showMediaPicker ? 'bg-gray-200' : 'hover:bg-gray-100'}`} title="Add GIF or Emoji">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="fill-current text-gray-500 hover:text-black transition-colors"><path d="M9 7c-5.533 0-8 2.468-8 8s2.467 8 8 8 8-2.468 8-8-2.467-8-8-8zm-2.5 4c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5.672-1.5 1.5-1.5zm6.213 6.701c-.86.874-2.074 1.299-3.713 1.299s-2.853-.425-3.713-1.299c-.387-.394-.382-1.026.012-1.414.395-.387 1.027-.383 1.414.012.471.479 1.197.701 2.287.701s1.816-.223 2.287-.701c.388-.395 1.021-.398 1.414-.012.394.388.399 1.021.012 1.414zm-1.213-3.701c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm11.5-8.5c0 .828-.671 1.5-1.5 1.5h-1.5v1.5c0 .828-.671 1.5-1.5 1.5s-1.5-.672-1.5-1.5v-1.5h-1.5c-.829 0-1.5-.672-1.5-1.5s.671-1.5 1.5-1.5h1.5v-1.5c0-.828.671-1.5 1.5-1.5s1.5.672 1.5 1.5v1.5h1.5c.829 0 1.5.672 1.5 1.5z" /></svg>
                            </button>
                            {showMediaPicker && (
                                <div className="absolute bottom-full left-0 mb-2 z-50">
                                    <ChatMediaPicker
                                        hideGifs={currentUser?.role === 'teacher'}
                                        onGifSelect={handleGifSelect}
                                        onEmojiSelect={handleEmojiSelect}
                                        onClose={() => setShowMediaPicker(false)}
                                    />
                                </div>
                            )}
                        </div>

                        <input type="text" value={newMessage} disabled={isGroupExpired} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder={isGroupExpired ? "Group expired" : "Message team..."} className="flex-1 bg-gray-50 border border-transparent rounded-xl px-5 py-3.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-black/5 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed" />
                        <button 
                            onClick={handleSend} 
                            disabled={isGroupExpired || (!newMessage.trim() && !selectedGif && !selectedAttachment) || isUploadingAttachment} 
                            className={`px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                                (isGroupExpired || (!newMessage.trim() && !selectedGif && !selectedAttachment) || isUploadingAttachment) 
                                ? "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed" 
                                : "bg-[#0F172A] text-white shadow-lg shadow-[#0F172A]/20 hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
                            }`}
                        >
                            Send
                        </button>
                    </div>
                    {isGroupExpired && (
                        <p className="text-xs text-red-500 font-semibold">Group deadline has passed. Messaging is disabled.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
