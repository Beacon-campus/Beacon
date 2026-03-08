import React, { useRef, useState, useEffect, useCallback } from "react";
import MessageItem from "../shared/MessageItem";
import ChatMediaPicker from "../chat_comps/ChatMediaPicker";
import SendIcon from "../../assets/send.svg";
import { MAX_CHAR_COUNT, BANNED_EMOJIS, ENGLISH_AND_EMOJI_REGEX } from "../../utils/chatConstants";
import socket from "../../services/socket.service";
import { toast } from "react-hot-toast";
import { ACCEPTED_ATTACHMENT_EXTENSIONS, uploadAttachment } from "../../utils/attachmentUpload";

export default function StudentHub({
    chatMessages,
    currentUser,
    channelId,
    onSend,
    onDelete,
    typingUsers,
    hasMoreOlder = false,
    isLoadingOlder = false,
    onLoadOlder,
}) {
    const formatScrollDateLabel = useCallback((value) => {
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
    }, []);

    const [chatInput, setChatInput] = useState("");
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [selectedGif, setSelectedGif] = useState(null);
    const [selectedAttachment, setSelectedAttachment] = useState(null);
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
    const [emojiError, setEmojiError] = useState("");
    const [languageError, setLanguageError] = useState("");

    const chatEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const isAtBottom = useRef(true);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [showDateBadge, setShowDateBadge] = useState(false);
    const [dateBadgeText, setDateBadgeText] = useState("");
    const isFetchingOlderRef = useRef(false);
    const hideDateBadgeTimeoutRef = useRef(null);
    const lastTypingEmitRef = useRef(0);
    const typingTimeoutRef = useRef(null);
    const uploadInputRef = useRef(null);

    useEffect(() => {
        if (channelId) socket.emit("join_room", channelId);
    }, [channelId]);

    const scrollToBottom = useCallback(() => {
        if (chatEndRef.current?.parentElement) {
          chatEndRef.current.parentElement.scrollTo({
            top: chatEndRef.current.parentElement.scrollHeight,
            behavior: "smooth"
          });
        }
    }, []);

    useEffect(() => {
        const lastMessage = chatMessages[chatMessages.length - 1];
        const isMe = lastMessage?.isMe || lastMessage?.sender?._id === currentUser?._id;

        if (isAtBottom.current || isMe) {
            scrollToBottom();
            const timeoutId = setTimeout(scrollToBottom, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [chatMessages, typingUsers, scrollToBottom, currentUser]);

    const handleScroll = async (e) => {
        const container = e.target;
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isBottom = scrollHeight - scrollTop - clientHeight < 100;
        isAtBottom.current = isBottom;
        setShowScrollButton(!isBottom);

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

        if (scrollTop < 80 && hasMoreOlder && !isLoadingOlder && !isFetchingOlderRef.current && onLoadOlder) {
            isFetchingOlderRef.current = true;
            const prevHeight = container.scrollHeight;
            const prevTop = container.scrollTop;
            const loadedCount = await onLoadOlder();
            if (loadedCount > 0) {
                toast.success(`Loaded ${loadedCount} older messages`, { id: `older-${channelId || "hub"}` });
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

    const handleInputChange = (e) => {
        const text = e.target.value;
        if (channelId && currentUser) {
            const now = Date.now();
            if (now - lastTypingEmitRef.current > 2000) {
                socket.emit("typing_start", { channelId, userId: currentUser._id, userName: currentUser.profile?.name });
                lastTypingEmitRef.current = now;
            }
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit("typing_end", { channelId, userId: currentUser._id });
                lastTypingEmitRef.current = 0;
            }, 2000);
        }
        if (BANNED_EMOJIS.test(text)) setEmojiError("Explicit emojis are disabled.");
        else setEmojiError("");
        if (!ENGLISH_AND_EMOJI_REGEX.test(text)) setLanguageError("Only English characters are allowed.");
        else setLanguageError("");
        setChatInput(text);
    };

    const handleSend = () => {
        if ((!chatInput.trim() && !selectedGif && !selectedAttachment) || emojiError || languageError || isUploadingAttachment) return;
        onSend(chatInput, selectedGif, selectedAttachment);
        setChatInput("");
        setSelectedGif(null);
        setSelectedAttachment(null);
    };

    const isSendDisabled = (!chatInput.trim() && !selectedGif && !selectedAttachment) || !!emojiError || !!languageError || isUploadingAttachment;

    const handlePickUpload = () => uploadInputRef.current?.click();

    const handleUploadSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIsUploadingAttachment(true);
            const uploaded = await uploadAttachment(file, "community_hub");
            setSelectedAttachment(uploaded);
            toast.success("File attached");
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message || "Failed to upload file");
        } finally {
            setIsUploadingAttachment(false);
            if (uploadInputRef.current) uploadInputRef.current.value = "";
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {!channelId ? (
                <div className="text-center text-gray-400 mt-10">Connecting to Student Hub...</div>
            ) : (
                <div className="flex-1 relative min-h-0">
                    {showDateBadge && dateBadgeText && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-full border border-black/10 bg-white/95 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-700 shadow">
                            {dateBadgeText}
                        </div>
                    )}
                    {showScrollButton && (
                        <button onClick={scrollToBottom} className="absolute top-14 right-1/2 translate-x-1/2 bg-black text-white p-2 rounded-full shadow-lg z-20 animate-in fade-in zoom-in"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg></button>
                    )}
                    <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto space-y-4 pb-4 px-4 pt-4 soft-scrollbar" onScroll={handleScroll}>
                        {isLoadingOlder && (
                            <div className="text-center text-[10px] uppercase tracking-widest font-bold text-gray-400 py-2">
                                Loading older messages...
                            </div>
                        )}
                        {chatMessages.map((msg, idx) => {
                            const prevMsg = idx > 0 ? chatMessages[idx - 1] : null;
                            const nextMsg = idx < chatMessages.length - 1 ? chatMessages[idx + 1] : null;
                            const getId = (m) => m?.sender?._id || m?.senderId || (typeof m?.sender === 'string' ? m.sender : null);
                            const currentSenderId = getId(msg);
                            const prevSenderId = getId(prevMsg);
                            const nextSenderId = getId(nextMsg);
                            const isConsecutive = prevMsg && prevSenderId === currentSenderId;
                            const isLastInStack = !nextMsg || nextSenderId !== currentSenderId;
                            return (
                                <div key={msg._id || idx} data-message-date={msg?.createdAt || msg?.sentAt || ""}>
                                    <MessageItem msg={msg} currentUser={currentUser} onDelete={onDelete} isConsecutive={isConsecutive} isLastInStack={isLastInStack} index={idx} total={chatMessages.length} isCommunity={true} showReadReceipt={false} />
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>
                </div>
            )}

            {typingUsers.length > 0 && <div className="px-6 py-1 bg-white text-xs text-gray-400 italic animate-pulse transition-all border-t border-gray-50">{typingUsers.length === 1 ? `${typingUsers[0].userName || "Someone"} is typing...` : "Several people are typing..."}</div>}

            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                <div className="flex flex-col gap-2 relative w-full">
                    {(emojiError || languageError) && <p className="text-xs text-red-500 font-bold px-2 animate-pulse">{emojiError || languageError}</p>}
                    {selectedGif && (
                        <div className="relative w-fit ml-2 mb-2">
                            <img src={selectedGif} alt="GIF Preview" className="h-24 rounded-lg border border-gray-200" />
                            <button onClick={() => setSelectedGif(null)} className="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold ring-2 ring-white hover:bg-gray-800">&times;</button>
                        </div>
                    )}
                    {selectedAttachment && (
                        <div className="relative w-fit ml-2 mb-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                            <p className="font-semibold truncate max-w-[220px]">{selectedAttachment.name}</p>
                            <button onClick={() => setSelectedAttachment(null)} className="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold ring-2 ring-white hover:bg-gray-800">&times;</button>
                        </div>
                    )}
                    {isUploadingAttachment && <p className="text-xs text-gray-500 font-semibold px-2">Uploading attachment...</p>}
                    <div className="flex items-center gap-3 relative">
                        <input
                            ref={uploadInputRef}
                            type="file"
                            className="hidden"
                            accept={ACCEPTED_ATTACHMENT_EXTENSIONS}
                            onChange={handleUploadSelected}
                        />
                        <button onClick={handlePickUpload} className="p-2 rounded-full hover:bg-gray-100 transition-colors" title="Attach document/image">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                                <path d="M13.5 3H12H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H12M13.5 3L19 8.625M13.5 3V7.625C13.5 8.17728 13.9477 8.625 14.5 8.625H19M19 8.625V11.8125" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M17.5 21L17.5 15M17.5 15L20 17.5M17.5 15L15 17.5" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <div className="relative">
                            <button onClick={() => setShowMediaPicker(!showMediaPicker)} className={`p-2 rounded-full transition-colors ${showMediaPicker ? 'bg-gray-200' : 'hover:bg-gray-100'}`} title="Add GIF or Emoji">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="fill-current text-gray-500 hover:text-black transition-colors"><path d="M9 7c-5.533 0-8 2.468-8 8s2.467 8 8 8 8-2.468 8-8-2.467-8-8-8zm-2.5 4c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5.672-1.5 1.5-1.5zm6.213 6.701c-.86.874-2.074 1.299-3.713 1.299s-2.853-.425-3.713-1.299c-.387-.394-.382-1.026.012-1.414.395-.387 1.027-.383 1.414.012.471.479 1.197.701 2.287.701s1.816-.223 2.287-.701c.388-.395 1.021-.398 1.414-.012.394.388.399 1.021.012 1.414zm-1.213-3.701c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm11.5-8.5c0 .828-.671 1.5-1.5 1.5h-1.5v1.5c0 .828-.671 1.5-1.5 1.5s-1.5-.672-1.5-1.5v-1.5h-1.5c-.829 0-1.5-.672-1.5-1.5s.671-1.5 1.5-1.5h1.5v-1.5c0-.828.671-1.5 1.5-1.5s1.5.672 1.5 1.5v1.5h1.5c.829 0 1.5.672 1.5 1.5z" /></svg>
                            </button>
                            {showMediaPicker && <div className="absolute bottom-full left-0 mb-2 z-50"><ChatMediaPicker hideGifs={currentUser?.role === 'teacher'} onGifSelect={(gif) => { setSelectedGif(gif); setShowMediaPicker(false); }} onEmojiSelect={(e) => setChatInput(p => p + e)} onClose={() => setShowMediaPicker(false)} /></div>}
                        </div>
                        <input value={chatInput} onChange={handleInputChange} onKeyDown={(e) => e.key === "Enter" && !isSendDisabled && handleSend()} className={`flex-1 bg-gray-100 rounded-full px-4 py-3 pr-20 text-sm focus:outline-none focus:ring-2 transition-all ${emojiError || languageError || chatInput.length > MAX_CHAR_COUNT ? "focus:ring-red-500 bg-red-50" : "focus:ring-black/5"}`} placeholder="Message class group..." />
                        <div className={`absolute bottom-3 right-16 text-[10px] font-bold pointer-events-none transition-colors ${chatInput.length > MAX_CHAR_COUNT ? "text-red-500" : "text-gray-400"}`}>{chatInput.length} / {MAX_CHAR_COUNT}</div>
                        <button 
                            onClick={handleSend} 
                            disabled={isSendDisabled} 
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                                isSendDisabled 
                                ? "bg-gray-200 cursor-not-allowed" 
                                : "bg-[#0F172A] hover:-translate-y-0.5 active:scale-95 active:translate-y-0 shadow-lg shadow-[#0F172A]/20"
                            }`}
                        >
                            <img src={SendIcon} className={`w-5 h-5 invert ${isSendDisabled ? 'opacity-40' : 'opacity-100'}`} alt="Send" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
