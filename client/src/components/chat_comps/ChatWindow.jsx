import React from "react";
import { getAvatarUrl } from "../../utils/avatarUtils";
import { auth } from "../../firebase/firebase";
import axios from "axios";
import { toast } from "react-hot-toast";
import { server } from "../../main";
import MessageItem from "../shared/MessageItem";
import AssignmentModal from "./AssignmentModal";
import SendIcon from "../../assets/send.svg";
import BackIcon from "../../assets/back.svg";
import { MAX_CHAR_COUNT, BANNED_EMOJIS, ENGLISH_AND_EMOJI_REGEX } from "../../utils/chatConstants";
import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "../../context/ChatContext";
import ChatMediaPicker from "./ChatMediaPicker";
import profanityFilter from "../../utils/profanityFilter";
import socket from "../../services/socket.service";
import {
  ACCEPTED_ATTACHMENT_EXTENSIONS,
  uploadAttachment,
} from "../../utils/attachmentUpload";

export default function ChatWindow({
  isHidden, activeChat, activeChatTitle, messages, currentUserInfo,
  onBack, onProfileClick, onUnfriend, isRestricted, role,
  newMessage, setNewMessage, onSendMessage, onDeleteMessage, onOpenDoubt, messagesEndRef,
  autoOpenAssignmentId, focusAssignmentId, autoOpenTab, autoOpenTimestamp,
  hasMoreOlder = false, isLoadingOlder = false, onLoadOlder
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

  const [emojiError, setEmojiError] = useState("");
  const [languageError, setLanguageError] = useState("");
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedGif, setSelectedGif] = useState(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [assignmentTab, setAssignmentTab] = useState("details");
  const [submittedAssignments, setSubmittedAssignments] = useState(new Set());
  const [doubtsFeed, setDoubtsFeed] = useState({ personalDoubts: [], broadcastReplies: [] });
  const [doubtInput, setDoubtInput] = useState("");
  const [isSendingDoubt, setIsSendingDoubt] = useState(false);
  const uploadInputRef = useRef(null);

  const { typingUsers, emitTypingStart, emitTypingEnd } = useChat();
  const typingTimeoutRef = useRef(null);
  const lastTypingEmitRef = useRef(0);

  const isAtBottom = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showDateBadge, setShowDateBadge] = useState(false);
  const [dateBadgeText, setDateBadgeText] = useState("");
  const scrollContainerRef = useRef(null);
  const isFetchingOlderRef = useRef(false);
  const hideDateBadgeTimeoutRef = useRef(null);
  const isDirectPeerChat = !!activeChat && !activeChat.isTeacherChat && !activeChat.type?.includes("group") && !activeChat.chatName;

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current?.parentElement) {
      messagesEndRef.current.parentElement.scrollTo({
        top: messagesEndRef.current.parentElement.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messagesEndRef]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    const channelId = activeChat?._id;

    if (channelId) {
      const now = Date.now();
      if (now - lastTypingEmitRef.current > 2000) {
        emitTypingStart(channelId);
        lastTypingEmitRef.current = now;
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emitTypingEnd(channelId);
        lastTypingEmitRef.current = 0;
      }, 2000);
    }

    if (BANNED_EMOJIS.test(text)) setEmojiError("Explicit emojis are disabled in this chat.");
    else setEmojiError("");

    if (!ENGLISH_AND_EMOJI_REGEX.test(text)) setLanguageError("Only English characters are allowed.");
    else setLanguageError("");

    setNewMessage(text);
  };

  useEffect(() => {
    return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
  }, []);

  useEffect(() => {
    const fetchMySubmissions = async () => {
      try {
        const user = auth.currentUser;
        if (!user || role !== "student") return;
        const token = await user.getIdToken();
        const { data } = await axios.get(`${server}/assignments/my-submissions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubmittedAssignments(new Set(data || []));
      } catch (err) {
        console.error("Failed to fetch my submissions:", err);
      }
    };

    fetchMySubmissions();
  }, [role]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isMe = lastMessage?.sender === currentUserInfo?._id || lastMessage?.isMe;

    if (isAtBottom.current || isMe) {
      scrollToBottom();
      const timeoutId = setTimeout(scrollToBottom, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, typingUsers, scrollToBottom, currentUserInfo]);

  useEffect(() => {
    if (role !== "student") return;

    const handleAssignmentDoubtReply = (payload) => {
      if (!assignmentModalOpen || !selectedAssignment) return;
      if (String(selectedAssignment._id) !== String(payload.assignmentId)) return;

      setDoubtsFeed((prev) => {
        const replyObj = {
          _id: `${payload.doubtId}_${payload.createdAt}`,
          text: payload.text,
          mode: payload.mode,
          createdAt: payload.createdAt,
          assignmentId: payload.assignmentId,
          assignmentTitle: payload.assignmentTitle,
        };

        const updatedPersonalDoubts = [...(prev.personalDoubts || [])];
        const updatedBroadcastReplies = [...(prev.broadcastReplies || [])];

        if (payload.mode === "broadcast") {
          updatedBroadcastReplies.unshift(replyObj);
        }

        const doubtIndex = updatedPersonalDoubts.findIndex((d) => String(d._id) === String(payload.doubtId));
        if (doubtIndex !== -1) {
          updatedPersonalDoubts[doubtIndex] = {
            ...updatedPersonalDoubts[doubtIndex],
            replies: [...(updatedPersonalDoubts[doubtIndex].replies || []), replyObj],
          };
        }

        return {
          personalDoubts: updatedPersonalDoubts,
          broadcastReplies: updatedBroadcastReplies,
        };
      });
    };

    socket.on("assignment_doubt_reply", handleAssignmentDoubtReply);
    return () => socket.off("assignment_doubt_reply", handleAssignmentDoubtReply);
  }, [role, assignmentModalOpen, selectedAssignment?._id]);

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
        toast.success(`Loaded ${loadedCount} older messages`, { id: `older-${activeChat?._id || "chat"}` });
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

  const isOverLimit = newMessage.length > MAX_CHAR_COUNT;
  const isSendDisabled =
    ((!newMessage.trim() && !selectedGif && !selectedAttachment) ||
      isOverLimit ||
      !!emojiError ||
      !!languageError ||
      isUploadingAttachment);

  const handleGifSelect = (gifUrl) => {
    setSelectedGif(gifUrl);
    setShowMediaPicker(false);
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
  };

  const handleSend = () => {
    if (isSendDisabled) return;
    let finalMessage = newMessage;
    if (finalMessage.trim().length > 0) {
      try {
        if (profanityFilter.isProfane(finalMessage)) {
          finalMessage = profanityFilter.clean(finalMessage);
        }
      } catch (err) { console.error("Profanity filter error:", err); }
    }
    onSendMessage(selectedGif, finalMessage, selectedAttachment);
    setSelectedGif(null);
    setSelectedAttachment(null);
    setNewMessage("");
  };

  const handlePickUpload = () => uploadInputRef.current?.click();

  const handleUploadSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingAttachment(true);
      const uploaded = await uploadAttachment(file, "dm");
      setSelectedAttachment(uploaded);
      toast.success("File attached");
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || "Failed to upload file");
    } finally {
      setIsUploadingAttachment(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const handleViewAssignment = async (assignmentId, tab = "details") => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      if (!assignmentId) {
        toast.error("Assignment details are unavailable.");
        return;
      }
      const token = await user.getIdToken();
      setAssignmentTab(tab);
      setAssignmentModalOpen(true);
      const { data } = await axios.get(`${server}/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedAssignment(data);
      setSubmissionFile(null);
      setDoubtInput("");
      if (role === "student") {
        try {
          const doubtsRes = await axios.get(`${server}/assignments/${assignmentId}/doubts/student`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setDoubtsFeed(doubtsRes.data || { personalDoubts: [], broadcastReplies: [] });
        } catch (err) {
          console.error("Failed to fetch assignment doubts:", err);
          setDoubtsFeed({ personalDoubts: [], broadcastReplies: [] });
        }
      }
    } catch (error) {
      console.error("Failed to fetch assignment:", error);
      toast.error("Could not load assignment details.");
      setAssignmentModalOpen(false);
    }
  };

  useEffect(() => {
    console.log("📍 ChatWindow loaded with autoOpenAssignmentId:", autoOpenAssignmentId, "tab:", autoOpenTab);
    if (autoOpenAssignmentId) {
      handleViewAssignment(autoOpenAssignmentId, autoOpenTab || "details");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAssignmentId, autoOpenTab, autoOpenTimestamp]);

  useEffect(() => {
    if (focusAssignmentId && messages?.length > 0) {
      const targetMsg = messages.find((m) => m?.assignmentId === focusAssignmentId || m?.assignmentId?._id === focusAssignmentId);
      if (targetMsg) {
        setTimeout(() => {
          const el = document.getElementById(`msg-${targetMsg._id}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 500);
      }
    }
  }, [focusAssignmentId, messages, autoOpenTimestamp]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setSubmissionFile(file);
  };

  const handleSubmitAssignment = async () => {
    if (!submissionFile || !selectedAssignment?._id) return;
    try {
      setIsSubmitting(true);
      const user = auth.currentUser;
      const token = await user.getIdToken();
      const uploaded = await uploadAttachment(
        submissionFile,
        "assignment_submission",
        { assignmentId: selectedAssignment._id }
      );

      await axios.post(
        `${server}/assignments/${selectedAssignment._id}/submit`,
        { file: uploaded },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSubmittedAssignments((prev) => new Set(prev).add(selectedAssignment._id));
      toast.success("Assignment submitted successfully");
      setAssignmentModalOpen(false);
      setSubmissionFile(null);
    } catch (submitErr) {
      console.error("Submission failed:", submitErr);
      toast.error(submitErr?.response?.data?.error || submitErr?.message || "Failed to submit assignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendAssignmentDoubt = async () => {
    if (!selectedAssignment?._id || !doubtInput.trim()) return;
    try {
      setIsSendingDoubt(true);
      const token = await auth.currentUser.getIdToken();
      await axios.post(
        `${server}/assignments/${selectedAssignment._id}/doubts`,
        { text: doubtInput.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDoubtInput("");
      const doubtsRes = await axios.get(`${server}/assignments/${selectedAssignment._id}/doubts/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDoubtsFeed(doubtsRes.data || { personalDoubts: [], broadcastReplies: [] });
      toast.success("Doubt sent");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to send doubt");
    } finally {
      setIsSendingDoubt(false);
    }
  };

  return (
    <div className={`flex-1 flex flex-col h-full bg-white ${isHidden ? "hidden md:flex" : "flex"}`}>
      {activeChat ? (
        <>
          <div onClick={onProfileClick} className="p-4 border-b border-gray-100 flex items-center gap-3 shadow-sm bg-white z-10 cursor-pointer hover:bg-gray-50 transition-colors shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="md:hidden">
              <img src={BackIcon} className="w-5 h-5" alt="back" />
            </button>
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0 overflow-hidden border border-gray-100">
              {(() => {
                const other = activeChat?.participants?.find(p => p.firebaseUid !== auth.currentUser?.uid);
                return <img src={getAvatarUrl(other?.profile?.avatar || 11)} className="w-full h-full object-cover" alt={activeChatTitle} onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerText = activeChatTitle?.[0] }} />;
              })()}
            </div>
            <h3 className="font-bold text-gray-800">{activeChatTitle}</h3>
            {role === 'student' && !activeChat.isTeacherChat && !activeChat.type?.includes("group") && (
              <div className="ml-auto flex items-center relative group" onClick={(e) => e.stopPropagation()}>
                {(() => {
                  const other = activeChat?.participants?.find(p => p.firebaseUid !== auth.currentUser?.uid);
                  if (!other || isRestricted) return null;
                  return (
                    <>
                      <button className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors hidden md:block group-hover:bg-gray-100">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors md:hidden">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                      </button>
                      <div className="absolute right-0 top-full mt-2 w-40 dropdown-menu-glass rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-[100] overflow-hidden">
                        <button onClick={(e) => { e.stopPropagation(); onUnfriend(other); }} className="w-full text-left px-4 py-3 text-xs text-red-600 hover:bg-red-50 font-bold flex items-center gap-3 transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                          Unfriend
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="flex-1 relative min-h-0">
            {showDateBadge && dateBadgeText && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-full border border-black/10 bg-white/95 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-700 shadow">
                {dateBadgeText}
              </div>
            )}
            {showScrollButton && (
              <button onClick={scrollToBottom} className="absolute bottom-4 right-6 bg-white border border-gray-100 text-gray-500 p-2.5 rounded-full shadow-md hover:text-[#0F172A] hover:bg-gray-50 transition-all z-20 animate-in fade-in zoom-in duration-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
            )}
            <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto soft-scrollbar p-4 space-y-4 bg-gray-50/50" onScroll={handleScroll}>
              {isLoadingOlder && (
                <div className="text-center text-[10px] uppercase tracking-widest font-bold text-gray-400 py-1">
                  Loading older messages...
                </div>
              )}
              {messages.map((msg, idx) => (
                <div id={`msg-${msg._id}`} key={`${msg._id}-${idx}`} data-message-date={msg?.createdAt || msg?.sentAt || ""}>
                  <MessageItem
                    msg={msg}
                    isTeacherChat={!!activeChat.isTeacherChat}
                    onOpenDoubt={onOpenDoubt}
                    onViewAssignment={handleViewAssignment}
                    onAskQuery={handleViewAssignment}
                    isSubmitted={submittedAssignments.has(msg.assignmentId?._id || msg.assignmentId)}
                    role={role}
                    currentUser={currentUserInfo}
                    onDelete={onDeleteMessage}
                    index={idx}
                    total={messages.length}
                    showReadReceipt={isDirectPeerChat}
                    disableDeleteActions={!!activeChat.isTeacherChat}
                  />
                </div>
              ))}
              <div ref={messagesEndRef}></div>
            </div>
          </div>

          {typingUsers.length > 0 && (
            <div className="px-6 py-1 bg-white text-xs text-gray-400 italic animate-pulse transition-all">
              {typingUsers.length === 1 ? `${typingUsers[0].userName} is typing...` : "Many users are typing..."}
            </div>
          )}

          <div className="p-4 border-t border-gray-100 bg-white shrink-0">
            {(role === 'student' && activeChat.isTeacherChat && !activeChat.canMessage) ? (
              <div className="flex items-center justify-center gap-2 w-full bg-gray-50 rounded-[28px] border border-gray-100 py-3 px-4 shadow-sm text-gray-400 cursor-not-allowed select-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <p className="text-[13px] font-semibold">Direct messages are not allowed in teacher channels.</p>
              </div>
            ) : isRestricted ? (
              <p className="text-center text-red-400 text-sm font-semibold bg-red-50 p-2 rounded-lg">You must be friends with this user to message them.</p>
            ) : (
              <div className="flex flex-col gap-2 relative">
                {selectedGif && (
                  <div className="relative w-fit">
                    <img src={selectedGif} alt="GIF Preview" className="h-24 rounded-lg border border-gray-200" />
                    <button onClick={() => setSelectedGif(null)} className="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold ring-2 ring-white hover:bg-gray-800">&times;</button>
                  </div>
                )}
                {selectedAttachment && (
                  <div className="relative w-fit rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                    <p className="font-semibold truncate max-w-[220px]">{selectedAttachment.name}</p>
                    <button onClick={() => setSelectedAttachment(null)} className="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold ring-2 ring-white hover:bg-gray-800">&times;</button>
                  </div>
                )}
                {(emojiError || languageError) && <p className="text-xs text-red-500 font-bold px-2 animate-pulse">{emojiError || languageError}</p>}
                {isUploadingAttachment && <p className="text-xs text-gray-500 font-semibold px-2">Uploading attachment...</p>}

                <div className="flex items-center gap-2 relative w-full bg-gray-50 rounded-[28px] border border-gray-100 p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-[#0F172A]/20 transition-all">
                  <input
                    ref={uploadInputRef}
                    type="file"
                    className="hidden"
                    accept={ACCEPTED_ATTACHMENT_EXTENSIONS}
                    onChange={handleUploadSelected}
                  />
                  
                  {/* LEFT ICONS */}
                  <div className="flex items-center pl-1 shrink-0">
                    <button onClick={handlePickUpload} className="p-2 text-gray-400 hover:text-[#0F172A] rounded-full transition-colors" title="Attach document/image">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    </button>
                    <div className="relative">
                      <button onClick={() => setShowMediaPicker(!showMediaPicker)} className={`p-2 rounded-full transition-colors ${showMediaPicker ? "text-[#0F172A] bg-gray-200" : "text-gray-400 hover:text-[#0F172A]"}`} title="Add GIF or Emoji">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                      </button>
                      {showMediaPicker && (
                        <div className="absolute bottom-full left-0 mb-2 z-50">
                          <ChatMediaPicker
                            hideGifs={role === 'teacher'}
                            onGifSelect={handleGifSelect}
                            onEmojiSelect={handleEmojiSelect}
                            onClose={() => setShowMediaPicker(false)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* INPUT AREA */}
                  <div className="flex-1 relative flex items-center min-w-0">
                    <input 
                      type="text" 
                      value={newMessage} 
                      onChange={handleInputChange} 
                      onKeyDown={(e) => e.key === "Enter" && !isSendDisabled && handleSend()} 
                      placeholder="Type a message..." 
                      className={`w-full bg-transparent pl-2 pr-14 outline-none text-[15px] text-gray-800 placeholder-gray-400 min-w-0 ${emojiError || languageError || isOverLimit ? "bg-red-50 text-red-600 rounded-lg py-1.5" : "py-2"}`} 
                    />
                    {/* CHAR COUNT */}
                    <div className={`absolute right-2 text-[9px] font-bold pointer-events-none transition-colors ${isOverLimit ? "text-red-500" : "text-gray-400"}`}>
                      {newMessage.length}/{MAX_CHAR_COUNT}
                    </div>
                  </div>
                  
                  {/* SEND BUTTON */}
                  <button onClick={handleSend} disabled={isSendDisabled} className={`p-2.5 rounded-full transition-all duration-200 shrink-0 shadow-sm outline-none overflow-hidden flex items-center justify-center relative ${isSendDisabled ? "bg-gray-200 cursor-not-allowed border border-gray-300" : "bg-[#059669] shadow-md hover:scale-105"}`}>
                    <img src={SendIcon} className={`w-5 h-5 translate-x-0.5 ${isSendDisabled ? "opacity-30" : "invert"}`} alt="Send" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4"><svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg></div>
          <p className="text-lg font-medium">Select a chat to start messaging</p>
        </div>
      )}

      <AssignmentModal
        isOpen={assignmentModalOpen}
        assignment={selectedAssignment}
        role={role}
        assignmentTab={assignmentTab}
        setAssignmentTab={setAssignmentTab}
        submitted={submittedAssignments.has(selectedAssignment?._id)}
        submissionFile={submissionFile}
        onFileChange={handleFileChange}
        onClose={() => {
          setAssignmentModalOpen(false);
          setSubmissionFile(null);
        }}
        onSubmit={handleSubmitAssignment}
        isSubmitting={isSubmitting}
        doubtsFeed={doubtsFeed}
        doubtInput={doubtInput}
        setDoubtInput={setDoubtInput}
        onSendDoubt={handleSendAssignmentDoubt}
        isSendingDoubt={isSendingDoubt}
      />
    </div>
  );
}
