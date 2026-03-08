import React, { useState, useEffect, useMemo } from "react";
import { auth } from "../../firebase/firebase";
import socket from "../../services/socket.service";
import axios from "axios";
import { server } from "../../main";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useCommunity } from "../../context/CommunityContext";
import profanityFilter from "../../utils/profanityFilter";
import BookIcon from "../../assets/classroom/book.svg";

import StudentHub from "./StudentHub";
import OfficialChannel from "./OfficialChannel";
import TeacherClassList from "./TeacherClassList";
import DoubtModal from "../shared/DoubtModal";
import ClassroomInfoModal from "./ClassRoomInfoModal";

const AESTHETIC_COLORS = ["#FFD1DC", "#FFABAB", "#FFC3A0", "#FF677D", "#D4A5A5", "#B5EAD7", "#C7CEEA", "#E2F0CB", "#FF9AA2", "#FFDAC1"];
const getClassroomColor = (id) => {
  if (!id) return "#E2F0CB";
  return AESTHETIC_COLORS[id.charCodeAt(id.length - 1) % AESTHETIC_COLORS.length];
};

export default function Community({ role }) {
  const { user: currentUser } = useAuth();
  const { secondaryChats, loading: chatLoading, fetchChats } = useChat();
  const {
    announcements,
    announcementPages,
    hubMessages,
    hubPages,
    fetchAnnouncements,
    fetchHubMessages,
    loadOlderAnnouncements,
    loadOlderHubMessages,
    fetchDoubts,
    syncClassrooms,
    hasSynced,
    addHubMessage,
    deleteHubMessageForMe,
    doubts
  } = useCommunity();

  const [activeTab, setActiveTab] = useState("official");
  const [teacherViewMode, setTeacherViewMode] = useState("list");
  const [activeTeacherClass, setActiveTeacherClass] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDoubtModal, setShowDoubtModal] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [hubTypingUsers, setHubTypingUsers] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState("...");

  useEffect(() => {
    if (currentUser && !hasSynced) {
      syncClassrooms();
      fetchChats();
    }
  }, [currentUser, hasSynced, syncClassrooms, fetchChats]);

  const studentClassroom = useMemo(() => {
    if (role === "teacher") return null;
    // Preference: Enrolled array in user profile
    if (currentUser?.enrolledClassroomIds?.length > 0) {
      const enrolled = currentUser.enrolledClassroomIds[0];
      if (typeof enrolled === 'object' && enrolled !== null) return enrolled;
    }
    // Fallback: Find in secondary chats
    return secondaryChats.find(c => c.type === 'classroom');
  }, [secondaryChats, currentUser, role]);

  const activeClassroom = role === 'teacher' ? activeTeacherClass : studentClassroom;
  const officialChannelId = role === 'student' ? studentClassroom?.officialChannelId : activeTeacherClass?._id;
  const unofficialChannelId = role === 'student' ? studentClassroom?.unofficialChannelId : null;

  const chatMessages = useMemo(() => {
    return (unofficialChannelId ? hubMessages[unofficialChannelId] : []) || [];
  }, [unofficialChannelId, hubMessages]);

  // --- 3. FETCH ON TAB CHANGE & SUBJECTS ---
  useEffect(() => {
    if (activeTab === "official" && officialChannelId) {
      fetchAnnouncements(officialChannelId);
    } else if (activeTab === "unofficial" && unofficialChannelId) {
      fetchHubMessages(unofficialChannelId);
    }
  }, [activeTab, officialChannelId, unofficialChannelId, fetchAnnouncements, fetchHubMessages]);

  useEffect(() => {
    if (role === 'teacher' && activeTeacherClass?._id) {
      setTeacherSubjects("Loading...");
      const getSubjects = async () => {
        try {
          const token = await auth.currentUser.getIdToken();
          const { data } = await axios.get(`${server}/classroom/details/${activeTeacherClass._id}`, { headers: { Authorization: `Bearer ${token}` } });
          if (data && data.subjects) {
            const mySubjects = data.subjects.filter(s => s.teacherIds.some(t => t._id === currentUser._id || t === currentUser._id));
            if (mySubjects.length > 0) {
              setTeacherSubjects(mySubjects.map(s => s.name).join(', '));
            } else {
              setTeacherSubjects("No Subjects Assigned");
            }
          } else {
            setTeacherSubjects("Unknown Subjects");
          }
        } catch (e) {
          console.error("Failed to load subs", e);
          setTeacherSubjects("Unknown Subjects");
        }
      };
      getSubjects();
    }
  }, [activeTeacherClass, role, currentUser]);

  // --- 4. TYPING LISTENERS ---
  useEffect(() => {
    if (!unofficialChannelId || activeTab !== 'unofficial') return;
    const handleStart = ({ userId, userName }) => setHubTypingUsers(p => p.find(u => u.userId === userId) ? p : [...p, { userId, userName }]);
    const handleEnd = ({ userId }) => setHubTypingUsers(p => p.filter(u => u.userId !== userId));
    socket.on("user_typing_start", handleStart);
    socket.on("user_typing_end", handleEnd);
    return () => {
      socket.off("user_typing_start", handleStart);
      socket.off("user_typing_end", handleEnd);
      setHubTypingUsers([]);
    };
  }, [unofficialChannelId, activeTab]);

  const handleOpenDoubt = (announcement) => {
    setActiveAnnouncement(announcement);
    setShowDoubtModal(true);
    fetchDoubts(announcement._id, true);
  };

  const handleSendMessage = (text, gifUrl, attachment = null) => {
    if (!unofficialChannelId || !currentUser) return;
    let finalMessage = text;
    if (finalMessage.trim().length > 0 && profanityFilter.isProfane(finalMessage)) {
      finalMessage = profanityFilter.clean(finalMessage);
    }
    const customId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const senderProfile = currentUser.profile || { name: "User", avatar: 11 };
    const payload = {
      channelId: unofficialChannelId,
      text: attachment ? (finalMessage || attachment.name || "") : finalMessage,
      gifUrl,
      customId,
      type: attachment?.kind || "text",
      noteData: attachment
        ? {
          name: attachment.name,
          type: attachment.type,
          url: attachment.url,
          size: attachment.size,
          downloadUrl: attachment.downloadUrl || attachment.url,
          previewUrl: attachment.previewUrl || null,
          previewDownloadUrl: attachment.previewDownloadUrl || null,
          previewPath: attachment.previewPath || null,
          previewType: attachment.previewType || null,
          previewStatus: attachment.previewStatus || null,
          previewError: attachment.previewError || null,
        }
        : null,
      senderId: currentUser._id,
      senderProfile,
      firebaseUid: auth.currentUser.uid
    };
    addHubMessage(unofficialChannelId, {
      ...payload, _id: customId, createdAt: new Date().toISOString(),
      sender: { _id: currentUser._id, profile: senderProfile }, isMe: true
    });
    socket.emit("send_message", payload);
  };

  const handleDeleteMessage = async (messageId, type) => {
    try {
      const token = await auth.currentUser.getIdToken();
      if (type === "me") deleteHubMessageForMe(unofficialChannelId, messageId);
      await axios.put(`${server}/chat/message/delete`, { messageId, type }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) { console.error("Failed to delete", error); }
  };

  if (chatLoading || !currentUser) return <div className="p-10 text-center text-gray-400">Loading Community...</div>;

  const isClassView = (role === 'student') || (role === 'teacher' && teacherViewMode === 'class');
  const classColor = activeClassroom ? getClassroomColor(activeClassroom._id) : "#E2F0CB";

  return (
    <div className="w-full h-full bg-white rounded-2xl border border-gray-100 overflow-hidden relative flex flex-col">
      {role === "teacher" && teacherViewMode === "list" && (
        <TeacherClassList
          classes={secondaryChats.filter(c => c.type === 'classroom' && c.classroomMode === 'official')}
          onSelect={(cls) => { setActiveTeacherClass(cls); setTeacherViewMode("class"); }}
        />
      )}

      {isClassView && (
        <>
          <div className="shrink-0 py-4 px-5 bg-white border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {role === 'teacher' && (
                <button onClick={() => setTeacherViewMode("list")} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors -ml-2 mr-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
              )}
              <div className="w-10 h-10 rounded-full flex items-center justify-center border border-black/5 shrink-0" style={{ backgroundColor: classColor }}>
                <img src={BookIcon} className="w-5 h-5 object-contain opacity-80" alt="Logo" />
              </div>
              <div className="flex flex-col items-start gap-1">
                <h2 className="text-sm font-black text-gray-800 leading-tight">{activeClassroom?.name || "Classroom"}</h2>
                {role === 'teacher' ? (
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">YOU ARE TEACHING {teacherSubjects}</span>
                ) : (
                  <div className="relative flex items-center bg-gray-100 rounded-xl p-1 w-fit border border-gray-200/50 mt-0.5">
                    <div className={`absolute top-1 bottom-1 w-[80px] bg-[#0F172A] rounded-lg shadow-sm transition-transform duration-300 ease-out z-0 ${activeTab === 'unofficial' ? 'translate-x-[80px]' : 'translate-x-0'}`} />
                    <button onClick={() => setActiveTab("official")} className={`relative z-10 w-[80px] py-1 text-[10px] font-bold uppercase tracking-wide text-center transition-colors duration-200 ${activeTab === 'official' ? 'text-white' : 'text-gray-500 hover:text-black'}`}>Official</button>
                    <button onClick={() => setActiveTab("unofficial")} className={`relative z-10 w-[80px] py-1 text-[10px] font-bold uppercase tracking-wide text-center transition-colors duration-200 ${activeTab === 'unofficial' ? 'text-white' : 'text-gray-500 hover:text-black'}`}>Unofficial</button>
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => setShowInfoModal(true)} className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-400 font-serif font-bold italic hover:border-black hover:text-black hover:bg-gray-50 transition-all">i</button>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {activeTab === "official" ? (
              <OfficialChannel
                channelId={officialChannelId}
                currentUser={currentUser}
                isTeacher={role === 'teacher'}
                onOpenDoubt={handleOpenDoubt}
                hasMoreOlder={Boolean(announcementPages[officialChannelId]?.hasMore)}
                isLoadingOlder={Boolean(announcementPages[officialChannelId]?.loadingOlder)}
                onLoadOlder={() => loadOlderAnnouncements(officialChannelId)}
              />
            ) : (
              <StudentHub
                chatMessages={chatMessages}
                currentUser={currentUser}
                channelId={unofficialChannelId}
                onSend={handleSendMessage}
                onDelete={handleDeleteMessage}
                typingUsers={hubTypingUsers}
                hasMoreOlder={Boolean(hubPages[unofficialChannelId]?.hasMore)}
                isLoadingOlder={Boolean(hubPages[unofficialChannelId]?.loadingOlder)}
                onLoadOlder={() => loadOlderHubMessages(unofficialChannelId)}
              />
            )}
          </div>
        </>
      )}

      {showDoubtModal && <DoubtModal announcement={activeAnnouncement} doubts={doubts ? doubts[activeAnnouncement?._id] || [] : []} onClose={() => setShowDoubtModal(false)} />}
      {showInfoModal && activeClassroom && <ClassroomInfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} classroom={activeClassroom} isTeacher={role === 'teacher'} />}
    </div>
  );
}
