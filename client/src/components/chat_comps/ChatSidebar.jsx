import React, { useState } from "react";
import { getAvatarUrl } from "../../utils/avatarUtils";
import { auth } from "../../firebase/firebase";
import { useChat } from "../../context/ChatContext";
import AddChat from "./AddChat";

// Assets
import AddIcon from "../../assets/user-add.svg";

// Helper Component: Collapsible Section
const CollapsibleSection = ({ title, isOpen, onToggle, children }) => {
  return (
    <div className="border-b border-gray-50 last:border-0">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">{title}</h3>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        {children}
      </div>
    </div>
  );
};

export default function ChatSidebar({
  isHidden,
  role,
  peersChats,
  teachersChats,
  activeChat,
  onOpenChat,
  onOpenTeacherChat,
  loading,
  currentUserInfo,
  onChatAdded,
  onFriendAction,
  markAsRead,
  glowChatId,
  // Add Chat Props
  // Add Chat Props
  highlightUserId,
  onHighlightClear,
  isAddChatOpen,
  setIsAddChatOpen,
  classmates = [] // Default to empty array
}) {
  const [isPeersOpen, setIsPeersOpen] = useState(true);
  const [isOthersOpen, setIsOthersOpen] = useState(true);
  const [isTeachersOpen, setIsTeachersOpen] = useState(true);
  const { onlineUsers } = useChat();

  // --- SPLIT CHATS LOGIC ---
  const { classmateChats, otherChats } = React.useMemo(() => {
    const classChats = [];
    const outChats = [];

    peersChats.forEach(chat => {
        const otherUser = chat.participants.find((p) => {
            const isMeByUid = p.firebaseUid === auth.currentUser?.uid;
            const isMeById = currentUserInfo && p._id === currentUserInfo._id;
            return !isMeByUid && !isMeById;
        });

        if (!otherUser) return;

        // Check if otherUser is in Classmates list
        const isClassmate = classmates.some(s => s._id.toString() === otherUser._id.toString());

        if (isClassmate) {
            classChats.push(chat);
        } else {
            outChats.push(chat);
        }
    });

    return { classmateChats: classChats, otherChats: outChats };
  }, [peersChats, classmates, currentUserInfo]);

  const renderChatList = (chats, emptyMessage) => {
      if (loading) return <p className="p-4 text-center text-gray-400">Loading...</p>;
      if (chats.length === 0) return <p className="p-4 text-center text-gray-400 text-sm">{emptyMessage}</p>;

      return chats.map((chat, idx) => {
        const otherUser = chat.participants.find((p) => {
        const isMeByUid = p.firebaseUid === auth.currentUser?.uid;
          const isMeById = currentUserInfo && p._id === currentUserInfo._id;
          return !isMeByUid && !isMeById;
        });
        
        const otherUserProfile = otherUser?.profile || { name: "User" };
        const otherUserId = otherUser?._id;
        const isOnline = otherUserId && onlineUsers.includes(otherUserId.toString());

        return (
          <div
            key={chat._id || idx}
            onClick={() => {
                onOpenChat(chat);
                if (chat.unreadCount > 0) markAsRead(chat._id);
            }}
            id={`chat-item-${chat._id}`}
            className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-3 relative overflow-hidden ${
              activeChat?._id === chat._id ? "bg-blue-50" : ""
            } ${glowChatId === chat._id ? "animate-glow-pulse" : ""}`}>
            
            <div className="relative w-10 h-10 shrink-0">
              <div className="w-full h-full rounded-full bg-black text-white flex items-center justify-center font-bold overflow-hidden border border-gray-100">
                  <img 
                  src={getAvatarUrl(otherUserProfile.avatar || 11)} 
                  className="w-full h-full object-cover" 
                  alt={otherUserProfile.name} 
                  onError={(e) => {e.target.style.display='none'; e.target.parentElement.innerText=otherUserProfile.name?.[0]}}
                  />
              </div>
              {/* Global Online Status Dot (Only for Peers) */}
              {isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              )}
            </div>
            <div className="overflow-hidden flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center w-full">
                <h3 className={`text-sm truncate pr-2 ${chat.unreadCount > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>
                    {otherUserProfile.name}
                  </h3>
                  {chat.lastMessage?.sentAt && (
                       <span className={`text-[10px] whitespace-nowrap ${chat.unreadCount > 0 ? "text-black font-bold" : "text-gray-400"}`}>
                           {new Date(chat.lastMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                  )}
              </div>
              <div className="flex justify-between items-center w-full mt-0.5">
                  <p className={`text-xs truncate flex-1 min-w-0 pr-2 ${chat.unreadCount > 0 ? "text-gray-900 font-semibold" : "text-gray-500"}`}>
                    {chat.lastMessage?.sender === currentUserInfo?._id && "You: "}
                    {chat.lastMessage?.text || "No messages yet"}
                  </p>
                                     {chat.unreadCount > 0 && (
                                       <div className="min-w-[18px] h-[18px] px-1 bg-[#059669] text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 shadow-sm">
                                         {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                                       </div>
                                     )}
              </div>
            </div>
          </div>
        );
      });
  };

  return (
    <div className={`w-full md:w-1/3 border-r border-gray-100 flex flex-col h-full ${isHidden ? "hidden md:flex" : "flex"}`}>
        {/* SIDEBAR HEADER with EXPANDING BUTTON */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10 sticky top-0 shrink-0">
             <h2 className="text-xl font-bold text-gray-800">Messages</h2>
             
             {/* EXPANDING NEW MESSAGE BUTTON */}
             <button
                 onClick={() => setIsAddChatOpen(true)}
                 className="group flex items-center bg-[#0F172A] text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-700 ease-out h-10 w-10 hover:w-36 overflow-hidden"
                 title="New Message"
             >
                 <div className="w-10 h-10 flex items-center justify-center shrink-0 transition-transform duration-700">
                      <img src={AddIcon} className="w-5 h-5 invert" alt="+" />
                 </div>
                 <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-700 w-0 group-hover:w-auto whitespace-nowrap text-xs font-bold overflow-hidden">
                      NEW MESSAGE
                 </span>
             </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            
            {/* PEERS SECTION */}
            <CollapsibleSection title={role === "student" ? "Classmates" : "Peers"} isOpen={isPeersOpen} onToggle={() => setIsPeersOpen(!isPeersOpen)}>
                 {renderChatList(classmateChats, role === "student" ? "No classmate chats yet." : "No peer chats yet.")}
            </CollapsibleSection>

            {/* OTHERS (FRIENDS FROM OTHER CLASSES) SECTION */}
            {otherChats.length > 0 && (
                 <CollapsibleSection title="Other Class" isOpen={isOthersOpen} onToggle={() => setIsOthersOpen(!isOthersOpen)}>
                      {renderChatList(otherChats, "No other chats.")}
                 </CollapsibleSection>
            )}

            {/* TEACHERS SECTION */}
            {role === "student" && (
                 <CollapsibleSection title="Teachers" isOpen={isTeachersOpen} onToggle={() => setIsTeachersOpen(!isTeachersOpen)}>
                      {teachersChats.length === 0 ? (
                           <p className="p-4 text-center text-gray-400 text-sm">No teacher messages.</p>
                      ) : (
                           teachersChats.map((chat, idx) => {
                                const otherParticipant = chat.participants.find((p) => p.role === 'teacher') || {};
                                const otherUser = otherParticipant?.profile || { name: "Teacher" };
                                const isAssignmentPreview = chat.lastMessage?.type === "assignment" || /^new assignment:/i.test(chat.lastMessage?.text || "");
                                const assignmentTitleFromText = (chat.lastMessage?.text || "").replace(/^new assignment:\s*/i, "").trim();
                                const teacherPreviewText = isAssignmentPreview
                                  ? (assignmentTitleFromText ? `New assignment: ${assignmentTitleFromText}` : "New assignment posted")
                                  : (chat.lastMessage?.text || "No messages yet");
                                return (
                                 <div
                                  key={chat._id || idx}
                                  onClick={() => {
                                    onOpenTeacherChat(chat);
                                    if (chat.unreadCount > 0 && chat.channelId) markAsRead(chat.channelId);
                                  }}
                                  className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                                    activeChat?._id === chat._id ? "bg-blue-50" : ""
                                  }`}>
                                     <div className="relative w-10 h-10 shrink-0">
                                       <div className="w-full h-full rounded-full bg-black text-white flex items-center justify-center font-bold overflow-hidden border border-gray-100">
                                         <img
                                           src={getAvatarUrl(otherUser.avatar || 11)}
                                           className="w-full h-full object-cover"
                                           alt={otherUser.name}
                                           onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerText = otherUser.name?.[0] || "T"; }}
                                         />
                                       </div>
                                     </div>
                                     <div className="overflow-hidden flex-1 flex flex-col justify-center">
                                       <div className="flex justify-between items-center w-full">
                                         <h3 className={`text-sm truncate pr-2 ${chat.unreadCount > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>
                                           {otherUser.name}
                                         </h3>
                                         {chat.lastMessage?.sentAt && (
                                           <span className={`text-[10px] whitespace-nowrap ${chat.unreadCount > 0 ? "text-black font-bold" : "text-gray-400"}`}>
                                             {new Date(chat.lastMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                           </span>
                                         )}
                                       </div>
                                       <p className={`text-xs truncate pr-2 mt-0.5 ${chat.unreadCount > 0 ? "text-gray-900 font-semibold" : "text-gray-500"}`}>
                                         {teacherPreviewText}
                                       </p>
                                     </div>
                                     {chat.unreadCount > 0 && (
                                       <div className="min-w-[18px] h-[18px] px-1 bg-black text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 shadow-sm">
                                         {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                                       </div>
                                     )}
                                 </div>
                                )
                           })
                      )}
                 </CollapsibleSection>
            )}
        </div>

        {/* ADD CHAT MODAL (Hidden Trigger) */}
        <AddChat 
            onChatAdded={onChatAdded} 
            userRole={role} 
            onFriendAction={onFriendAction} 
            highlightUserId={highlightUserId}
            onHighlightClear={onHighlightClear}
            isOpen={isAddChatOpen}
            onClose={() => setIsAddChatOpen(false)}
            hideTrigger={true}
        />
    </div>
  );
}
