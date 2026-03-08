import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { getAvatarUrl } from "../../utils/avatarUtils";
import SharedNoteBubble from "../SharedNoteBubble";
import { useCommunity } from "../../context/CommunityContext";
import { server } from "../../main";
import { auth } from "../../firebase/firebase";
import ChatMediaPicker from "../chat_comps/ChatMediaPicker"; 
import { toast } from "react-hot-toast";
import { ACCEPTED_ATTACHMENT_EXTENSIONS, uploadAttachment } from "../../utils/attachmentUpload";
import ImagePreviewModal from "../ui/ImagePreviewModal";

export default function OfficialChannel({
  channelId,
  currentUser,
  isTeacher,
  onOpenDoubt,
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

  const { announcements: announcementsCache, fetchAnnouncements, addAnnouncement } = useCommunity();
  const [announcementInput, setAnnouncementInput] = useState("");
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const uploadInputRef = useRef(null);
  
  const announcements = announcementsCache[channelId] || [];

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isAtBottom = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showDateBadge, setShowDateBadge] = useState(false);
  const [dateBadgeText, setDateBadgeText] = useState("");
  const isFetchingOlderRef = useRef(false);
  const hideDateBadgeTimeoutRef = useRef(null);

  useEffect(() => {
      if (channelId) fetchAnnouncements(channelId);
  }, [channelId, fetchAnnouncements]);

  const scrollToBottom = useCallback(() => {
      if (messagesEndRef.current?.parentElement) {
        messagesEndRef.current.parentElement.scrollTo({
          top: messagesEndRef.current.parentElement.scrollHeight,
          behavior: "smooth"
        });
      }
  }, []);

  useEffect(() => {
      const lastMessage = announcements[announcements.length - 1];
      const isMe = lastMessage?.teacherId?._id === currentUser?._id || lastMessage?.teacherId === currentUser?._id;
      
      if (isAtBottom.current || isMe) {
          scrollToBottom();
          const timeoutId = setTimeout(scrollToBottom, 300);
          return () => clearTimeout(timeoutId);
      }
  }, [announcements, scrollToBottom, currentUser]);

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
              toast.success(`Loaded ${loadedCount} older announcements`, { id: `older-${channelId || "official"}` });
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

  const postAnnouncement = async () => {
    if ((!announcementInput.trim() && !selectedAttachment) || isUploadingAttachment) return;
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      const { data } = await axios.post(
        `${server}/classroom/announcement`,
        {
          channelId: channelId,
          content: selectedAttachment ? (announcementInput || selectedAttachment.name || "") : announcementInput,
          type: selectedAttachment?.kind || "text",
          noteData: selectedAttachment
            ? {
                name: selectedAttachment.name,
                type: selectedAttachment.type,
                url: selectedAttachment.url,
                size: selectedAttachment.size,
                downloadUrl: selectedAttachment.downloadUrl || selectedAttachment.url,
                previewUrl: selectedAttachment.previewUrl || null,
                previewDownloadUrl: selectedAttachment.previewDownloadUrl || null,
                previewPath: selectedAttachment.previewPath || null,
                previewType: selectedAttachment.previewType || null,
                previewStatus: selectedAttachment.previewStatus || null,
                previewError: selectedAttachment.previewError || null,
              }
            : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      addAnnouncement(channelId, data);
      setAnnouncementInput("");
      setSelectedAttachment(null);
      setShowMediaPicker(false);
    } catch (error) {
      console.error("Error posting announcement", error);
    }
  };

  const handlePickUpload = () => uploadInputRef.current?.click();

  const handleUploadSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingAttachment(true);
      const uploaded = await uploadAttachment(file, "community_official");
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
    <div className="flex flex-col h-full bg-gray-50/50 relative">
      {showDateBadge && dateBadgeText && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-full border border-black/10 bg-white/95 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-700 shadow">
              {dateBadgeText}
          </div>
      )}
      {showScrollButton && (
          <button 
              onClick={scrollToBottom}
              className="absolute top-14 right-1/2 translate-x-1/2 bg-black text-white p-2 rounded-full shadow-lg hover:bg-gray-800 transition-all z-20 animate-in fade-in zoom-in duration-200"
          >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
      )}

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6 flex flex-col custom-scrollbar"
        onScroll={handleScroll}
      >
         {isLoadingOlder && (
            <div className="text-center text-[10px] uppercase tracking-widest font-bold text-gray-400 py-2">
              Loading older announcements...
            </div>
         )}
         {announcements.length === 0 ? (
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-10 text-center select-none gap-6">
                <div className="text-[80px] opacity-60 hover:opacity-100 hover:scale-110 transition-all duration-500 cursor-default">
                    📢
                </div>
                <div className="flex flex-col items-center gap-2">
                    <h2 className="text-2xl font-[600] text-gray-500 uppercase tracking-tighter">Announcements</h2>
                    <p className="text-sm font-[500] text-gray-400 uppercase tracking-widest max-w-[250px] leading-relaxed">
                        No official announcements yet.
                    </p>
                </div>
            </div>
         ) : (
            announcements.map((post, idx) => {
               const isMe = post.teacherId?._id === currentUser?._id || post.teacherId === currentUser?._id;
               
               const prevMsg = idx > 0 ? announcements[idx - 1] : null;
               const nextMsg = idx < announcements.length - 1 ? announcements[idx + 1] : null;
               
               const getId = (m) => m?.teacherId?._id || m?.teacherId;
               const currentSenderId = getId(post);
               const prevSenderId = getId(prevMsg);
               const nextSenderId = getId(nextMsg);
               
               const isConsecutive = prevMsg && prevSenderId === currentSenderId;
               const isLastInStack = !nextMsg || nextSenderId !== currentSenderId;

               let bubbleRadius = "rounded-2xl";
               if (isMe) {
                   if (!isConsecutive && isLastInStack) bubbleRadius = "rounded-2xl rounded-tr-none";
                   else if (!isConsecutive && !isLastInStack) bubbleRadius = "rounded-2xl rounded-tr-none rounded-br-md";
                   else if (isConsecutive && !isLastInStack) bubbleRadius = "rounded-2xl rounded-r-md";
                   else if (isConsecutive && isLastInStack) bubbleRadius = "rounded-2xl rounded-br-none rounded-tr-md";
               } else {
                   if (!isConsecutive && isLastInStack) bubbleRadius = "rounded-2xl rounded-tl-none";
                   else if (!isConsecutive && !isLastInStack) bubbleRadius = "rounded-2xl rounded-tl-none rounded-bl-md";
                   else if (isConsecutive && !isLastInStack) bubbleRadius = "rounded-2xl rounded-l-md";
                   else if (isConsecutive && isLastInStack) bubbleRadius = "rounded-2xl rounded-bl-none rounded-tl-md";
               }

               return (
                 <div 
                    key={post._id} 
                    data-message-date={post?.createdAt || ""}
                    className={`flex w-full gap-3 ${isMe ? "justify-end" : "justify-start"} ${!isConsecutive && idx !== 0 ? 'mt-6' : 'mt-1'}`}
                 >
                    {!isMe && (
                        <div className="w-8 shrink-0 flex items-start">
                            {!isConsecutive && (
                                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-bold text-xs overflow-hidden border border-gray-100 mt-0 shadow-sm">
                                    <img 
                                      src={getAvatarUrl(post.teacherId?.profile?.avatar || 1)} 
                                      className="w-full h-full object-cover" 
                                      alt={post.senderName} 
                                      onError={(e) => {e.target.style.display='none'; e.target.parentElement.innerText=post.senderName?.[0]}} 
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                       {!isConsecutive && (
                           <span className="text-[9px] text-gray-400 font-black px-1 uppercase tracking-tighter mb-0.5">
                               {isMe ? "(You)" : post.senderName}
                           </span>
                       )}
                       
                       {post.type === 'note' ? (
                           <SharedNoteBubble message={post} isMe={isMe} onOpenDoubt={onOpenDoubt} createdAt={post.createdAt} showReadReceipt={false} />
                       ) : (
                           <div className={`p-4 shadow-sm relative ${bubbleRadius} ${isMe ? "bg-black text-white text-right" : "bg-white text-gray-800 border border-gray-100 text-left"}`}>
                               {post.type === "image" ? (
                                   <img
                                     src={post.noteData?.url}
                                     alt={post.noteData?.name || "Shared image"}
                                     className="rounded-lg max-w-[300px] w-full object-cover border border-gray-200 cursor-zoom-in"
                                     onClick={() => setImagePreview({ url: post.noteData?.url, name: post.noteData?.name || "Shared image" })}
                                   />
                               ) : post.type === "file" ? (
                                   <div className="flex flex-col gap-2 text-xs">
                                      <p className="font-semibold break-all">{post.noteData?.name || "Shared file"}</p>
                                      <div className="flex items-center gap-3">
                                          <button
                                            type="button"
                                            onClick={() => window.open(post.noteData?.previewUrl || post.noteData?.url, "_blank")}
                                            className="underline"
                                          >
                                            View
                                          </button>
                                          <a href={post.noteData?.downloadUrl || post.noteData?.url} download={post.noteData?.name || "file"} className="underline">Download</a>
                                      </div>
                                   </div>
                               ) : (
                                   <div className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</div>
                               )}
                               
                               <div className={`mt-3 flex items-center justify-between border-t pt-2 gap-4 ${isMe ? "justify-end border-white/10" : "justify-between border-gray-100"}`}>
                                   <div className="flex items-center gap-3">
                                       <button 
                                          onClick={() => onOpenDoubt(post)} 
                                          className={`text-[10px] font-black tracking-wide px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm ${
                                              isMe ? "text-black bg-white hover:bg-gray-200" : "text-blue-600 bg-blue-50 hover:bg-blue-100"
                                          }`}
                                       >
                                           Check Queries
                                       </button>
                                       <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">
                                           {new Date(post.createdAt).toLocaleDateString()}
                                       </span>
                                   </div>
                               </div>
                           </div>
                       )}
                    </div>
                 </div>
               )
            })
         )}
         <div className="pb-4" ref={messagesEndRef} />
      </div>
      
      {isTeacher && (
          <div className="p-4 border-t border-gray-100 bg-white shrink-0">
             <div className="flex gap-3 items-center max-w-5xl mx-auto">
                <input
                  ref={uploadInputRef}
                  type="file"
                  className="hidden"
                  accept={ACCEPTED_ATTACHMENT_EXTENSIONS}
                  onChange={handleUploadSelected}
                />
                <button onClick={handlePickUpload} className="p-2.5 rounded-full hover:bg-gray-100 transition-colors" title="Attach document/image">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M13.5 3H12H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H12M13.5 3L19 8.625M13.5 3V7.625C13.5 8.17728 13.9477 8.625 14.5 8.625H19M19 8.625V11.8125" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17.5 21L17.5 15M17.5 15L20 17.5M17.5 15L15 17.5" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
                <div className="relative">
                     <button 
                         onClick={() => setShowMediaPicker(!showMediaPicker)} 
                         className={`p-2.5 rounded-full transition-colors ${showMediaPicker ? 'bg-gray-200' : 'hover:bg-gray-100'}`} 
                         title="Add Emoji"
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" className="fill-current text-gray-500 hover:text-black transition-colors"><path d="M9 7c-5.533 0-8 2.468-8 8s2.467 8 8 8 8-2.468 8-8-2.467-8-8-8zm-2.5 4c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5.672-1.5 1.5-1.5zm6.213 6.701c-.86.874-2.074 1.299-3.713 1.299s-2.853-.425-3.713-1.299c-.387-.394-.382-1.026.012-1.414.395-.387 1.027-.383 1.414.012.471.479 1.197.701 2.287.701s1.816-.223 2.287-.701c.388-.395 1.021-.398 1.414-.012.394.388.399 1.021.012 1.414zm-1.213-3.701c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm11.5-8.5c0 .828-.671 1.5-1.5 1.5h-1.5v1.5c0 .828-.671 1.5-1.5 1.5s-1.5-.672-1.5-1.5v-1.5h-1.5c-.829 0-1.5-.672-1.5-1.5s.671-1.5 1.5-1.5h1.5v-1.5c0-.828.671-1.5 1.5-1.5s1.5.672 1.5 1.5v1.5h1.5c.829 0 1.5.672 1.5 1.5z"/></svg>
                     </button>
                     {showMediaPicker && (
                         <div className="absolute bottom-full left-0 mb-2 z-50">
                             <ChatMediaPicker 
                                 hideGifs={true} 
                                 onEmojiSelect={(e) => setAnnouncementInput(p => p + e)} 
                                 onClose={() => setShowMediaPicker(false)} 
                             />
                         </div>
                     )}
                </div>

                <input 
                    type="text"
                    value={announcementInput} 
                    onChange={(e) => setAnnouncementInput(e.target.value)} 
                    onKeyDown={(e) => e.key === "Enter" && postAnnouncement()}
                    placeholder="Post an official announcement..." 
                    className="flex-1 bg-gray-50 border border-transparent rounded-xl px-5 py-3.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-black/5 focus:bg-white transition-all" 
                />
                <button 
                    onClick={postAnnouncement} 
                    disabled={(!announcementInput.trim() && !selectedAttachment) || isUploadingAttachment}
                    className="bg-black text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-20"
                >
                    Post
                </button>
             </div>
             {isUploadingAttachment && <p className="mt-2 text-xs text-gray-500 font-semibold">Uploading attachment...</p>}
             {selectedAttachment && (
                <div className="mt-3 max-w-5xl mx-auto">
                    <div className="relative w-fit rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                        <p className="font-semibold truncate max-w-[260px]">{selectedAttachment.name}</p>
                        <button onClick={() => setSelectedAttachment(null)} className="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold ring-2 ring-white hover:bg-gray-800">&times;</button>
                    </div>
                </div>
             )}
          </div>
      )}

      <ImagePreviewModal
        isOpen={!!imagePreview?.url}
        onClose={() => setImagePreview(null)}
        imageUrl={imagePreview?.url}
        imageName={imagePreview?.name}
      />
    </div>
  );
}
