import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { server } from "../../main";
import { auth } from "../../firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import socket from "../../services/socket.service";

import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import ChatProfileModal from "./ChatProfileModal";
import DoubtModal from "../shared/DoubtModal";

const DM_INITIAL_PAGE_SIZE = 40;
const DM_OLDER_PAGE_SIZE = 30;

export default function Chat({ role }) {
  const {
    chats: allChats,
    activeChat,
    setActiveChat,
    messages,
    setMessages,
    loading,
    markAsRead,
    fetchChats,
    classmates
  } = useChat();

  const [newMessage, setNewMessage] = useState("");
  const [mobileView, setMobileView] = useState("list");
  const { user: currentUserInfo, refreshUser } = useAuth();

  const peersChats = useMemo(() => {
    if (!auth.currentUser) return [];
    const user = auth.currentUser;
    const sameRoleChats = (allChats || []).filter(chat => {
      const other = chat.participants.find(p => p.firebaseUid !== user.uid);
      return other && other.role === role;
    });

    // Deduplicate by peer user id so a person appears once in the DM list.
    const byPeerId = new Map();
    sameRoleChats.forEach((chat) => {
      const other = chat.participants.find((p) => p.firebaseUid !== user.uid);
      const peerId = other?._id?.toString();
      if (!peerId) return;

      const existing = byPeerId.get(peerId);
      if (!existing) {
        byPeerId.set(peerId, chat);
        return;
      }

      const existingTime = existing?.lastMessage?.sentAt ? new Date(existing.lastMessage.sentAt).getTime() : 0;
      const currentTime = chat?.lastMessage?.sentAt ? new Date(chat.lastMessage.sentAt).getTime() : 0;

      if (currentTime >= existingTime) {
        byPeerId.set(peerId, chat);
      }
    });

    return Array.from(byPeerId.values());
  }, [allChats, role]);

  const teachersChats = useMemo(() => {
    if (!auth.currentUser) return [];
    return (allChats || []).filter((chat) => chat.isTeacherChat || chat.type === "teacher_virtual");
  }, [allChats]);

  useEffect(() => {
    if (activeChat && (activeChat.type === 'project_group' || activeChat.type === 'community' || activeChat.chatName)) {
      if (!activeChat.isTeacherChat) {
        setActiveChat(null);
      }
    }
  }, [activeChat, setActiveChat]);

  const activeChatTitle = useMemo(() => {
    if (!activeChat) return "";

    if (activeChat.isTeacherChat) {
      return activeChat.participant?.profile?.name || "Teacher";
    }

    if (activeChat.type?.includes("group") || activeChat.chatName) {
      return activeChat.chatName || "Project Group";
    }

    const otherUser = (activeChat.participants || []).find(
      (p) => p.firebaseUid !== auth.currentUser?.uid
    );

    return otherUser?.profile?.name || "Unknown User";
  }, [activeChat]);

  const [isAddChatOpen, setIsAddChatOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(null);

  const [showDoubtModal, setShowDoubtModal] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [doubts, setDoubts] = useState([]);
  const [doubtInput, setDoubtInput] = useState("");
  const [replyToComment, setReplyToComment] = useState(null);
  const doubtInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagePageByChannelRef = useRef({});
  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const isFriendEventRelevant = useCallback((event) => {
    if (!event?.type || role !== "student" || !currentUserInfo?._id) return false;

    const meId = currentUserInfo._id.toString();
    const friends = (currentUserInfo.friends || []).map((id) => id.toString());
    const sentRequests = (currentUserInfo.friendRequests?.sent || []).map((id) => id.toString());

    if (event.type === "FRIEND_REQUEST_ACCEPTED") {
      const accepterId = event.payload?.accepterId?.toString();
      if (!accepterId || accepterId === meId) return false;
      return sentRequests.includes(accepterId) || friends.includes(accepterId);
    }

    if (event.type === "FRIEND_REMOVED") {
      const removerId = event.payload?.removerId?.toString();
      if (!removerId || removerId === meId) return false;
      return friends.includes(removerId);
    }

    return false;
  }, [role, currentUserInfo]);

  useEffect(() => {
    const handleFriendEvent = (data) => {
      if (isFriendEventRelevant(data)) {
        fetchChats();
        refreshUser();
      }
    };
    socket.on("event", handleFriendEvent);
    return () => socket.off("event", handleFriendEvent);
  }, [refreshUser, fetchChats, isFriendEventRelevant]);

  const handleFriendAction = async (unfriendedId) => {
    await fetchChats();
    await refreshUser();
    if (unfriendedId && activeChat) {
      const targetId = unfriendedId.toString();
      const isParticipant = activeChat.participants.some((p) => p._id?.toString() === targetId);
      if (isParticipant) {
        setActiveChat(null);
        setMessages([]);
      }
    }
  };

  const handleChatAdded = (newChat) => {
    fetchChats();
    if (newChat) {
      handleOpenChat(newChat);
    }
  };

  const processFetchedMessages = useCallback((rawMessages = [], firebaseUid, currentUserId) => {
    return rawMessages
      .filter((msg) => {
        if (!msg.deletedFor) return true;
        return !msg.deletedFor.includes(currentUserId);
      })
      .map((msg) => ({
        ...msg,
        isMe: msg.sender?.firebaseUid === firebaseUid,
        text: msg.isDeleted ? "This message was deleted" : msg.text,
      }));
  }, []);

  // --- OPTIMIZATION: Wrap actions in useCallback ---
  const handleOpenChat = useCallback(async (chat) => {
    setActiveChat(chat);
    setMobileView("chat");
    setMessages([]);
    socket.emit("join_room", chat._id);

    const isWindowActive = !document.hidden && document.hasFocus();
    if (currentUserInfo?._id && isWindowActive) {
      socket.emit("mark_messages_seen", {
        channelId: chat._id,
        userId: currentUserInfo._id,
      });
    }

    try {
      const firebaseUser = auth.currentUser;
      const token = await firebaseUser.getIdToken();
      const { data } = await axios.get(`${server}/chat/messages/${chat._id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: DM_INITIAL_PAGE_SIZE },
      });

      const rawMessages = Array.isArray(data) ? data : data.messages || [];
      const pageInfo = Array.isArray(data)
        ? { hasMore: false, nextBefore: null }
        : data.pageInfo || { hasMore: false, nextBefore: null };

      const processedMessages = processFetchedMessages(rawMessages, firebaseUser.uid, currentUserInfo?._id);
      setMessages(processedMessages);

      messagePageByChannelRef.current[chat._id] = {
        hasMore: Boolean(pageInfo.hasMore),
        nextBefore: pageInfo.nextBefore || null,
      };
      setHasMoreOlderMessages(Boolean(pageInfo.hasMore));
      setLoadingOlderMessages(false);

      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error) {
      console.error("History Error:", error);
    }
  }, [currentUserInfo, setActiveChat, setMessages, processFetchedMessages]);

  const buildTeacherReplyMessage = useCallback((source, fallbackTeacher = null) => {
    const teacherId = source.teacherId || fallbackTeacher?._id;
    const teacherName = source.teacherName || fallbackTeacher?.profile?.name || "Teacher";
    const createdAt = source.timestamp || source.createdAt || new Date().toISOString();
    const text = (source.replyText || source.text || "").trim();
    if (!text) return null;

    // Live socket uses "mode", notification history uses "replyMode"
    const mode = source.replyMode || source.mode || "private";
    const assignmentId = source.relatedId || source.assignmentId || null;
    const doubtId = source.doubtId || "doubt";
    const assignmentTitle = source.assignmentTitle || null;
    const bubbleId =
      source.id ||
      `assignment_reply_${assignmentId || "assignment"}_${doubtId}_${new Date(createdAt).getTime()}`;

    // Only broadcast messages should appear in the primary DM view!
    // Private messages remain secluded to the Student Assignment Doubt Modal
    if (mode === "broadcast") {
      return {
        _id: bubbleId,
        type: "assignment_doubt_reply",
        text,
        doubtId,
        replyMode: mode,
        assignmentId: assignmentId,
        assignmentTitle: assignmentTitle,
        createdAt,
        sender: {
          _id: teacherId,
          profile: { name: teacherName },
        },
        isMe: false,
        isDeleted: false,
      };
    }

    return null; // Disable rendering teacher private doubt replies in the DM view
  }, []);

  const handleOpenTeacherChat = useCallback(async (teacherChat) => {
    setActiveChat(teacherChat);
    setMobileView("chat");
    setMessages([]);
    if (teacherChat?.channelId) {
      socket.emit("join_room", teacherChat.channelId);
      markAsRead(teacherChat.channelId);
    }

    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      if (teacherChat?.classroomId && teacherChat?.participant?._id) {
        await axios.put(
          `${server}/notifications/read`,
          {
            notificationType: "ASSIGNMENT_DOUBT_REPLY",
            classroomId: teacherChat.classroomId,
            teacherId: teacherChat.participant._id,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      const channelMessagesRes = await axios.get(`${server}/chat/messages/${teacherChat.channelId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: DM_INITIAL_PAGE_SIZE },
      });
      const activeTeacherId = String(teacherChat?.participant?._id || "");
      const channelRaw = Array.isArray(channelMessagesRes.data)
        ? channelMessagesRes.data
        : channelMessagesRes.data?.messages || [];
      const channelMessages = channelRaw
        .filter((msg) => {
          if (msg.type !== "assignment") return false;
          const senderId = String(msg?.sender?._id || msg?.sender || "");
          return senderId === activeTeacherId;
        })
        .map((msg) => ({
          ...msg,
          isMe: false,
          text: msg.isDeleted ? "This message was deleted" : msg.text,
        }));

      const studentAssignmentsRes = await axios.get(`${server}/assignments/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const assignmentTitleMap = {};
      (studentAssignmentsRes.data || []).forEach(a => {
        assignmentTitleMap[a._id] = a.title;
      });

      const assignmentFallbackBubbles = (studentAssignmentsRes.data || [])
        .filter((a) => String(a.classroomId) === String(teacherChat.classroomId))
        .filter((a) => String(a.teacherId?._id || a.teacherId) === String(teacherChat.participant._id))
        .filter((a) => {
          const aid = String(a._id);
          return !channelMessages.some((m) => String(m.assignmentId?._id || m.assignmentId) === aid);
        })
        .map((a) => ({
          _id: `assignment_fallback_${a._id}`,
          type: "assignment",
          text: `New Assignment: ${a.title}`,
          assignmentId: { _id: a._id, title: a.title, type: a.type },
          createdAt: a.createdAt || new Date().toISOString(),
          sender: {
            _id: teacherChat.participant._id,
            profile: { name: teacherChat.participant?.profile?.name || "Teacher" },
          },
          isMe: false,
          isDeleted: false,
        }));

      const notificationsRes = await axios.get(`${server}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const historicalReplyBubbles = (notificationsRes.data || [])
        .filter((n) => n.type === "ASSIGNMENT_DOUBT_REPLY")
        .filter((n) => n.relatedId || n.assignmentId)
        .filter((n) => !n.teacherId || String(n.teacherId) === String(teacherChat.participant._id))
        .filter((n) => !n.classroomId || String(n.classroomId) === String(teacherChat.classroomId))
        .map((n) => {
          if (!n.assignmentTitle) {
            n.assignmentTitle = assignmentTitleMap[n.relatedId || n.assignmentId];
          }
          return buildTeacherReplyMessage(n, teacherChat.participant);
        })
        .filter(Boolean);

      const processedMessages = [
        ...channelMessages,
        ...historicalReplyBubbles,
        ...assignmentFallbackBubbles,
      ]
        .filter((m) => m?.type === "assignment" || m?.type === "assignment_doubt_reply")
        .filter((m, idx, arr) => arr.findIndex((x) => String(x._id) === String(m._id)) === idx)
        .sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

      setMessages(processedMessages);
      setHasMoreOlderMessages(false);
      setLoadingOlderMessages(false);
    } catch (error) {
      console.error("History Error:", error);
    }
  }, [setActiveChat, setMessages, buildTeacherReplyMessage, markAsRead]);


  const loadOlderActiveChatMessages = useCallback(async () => {
    if (!activeChat?._id || activeChat?.isTeacherChat) return false;

    const page = messagePageByChannelRef.current[activeChat._id];
    if (!page?.hasMore || loadingOlderMessages || !page?.nextBefore) return false;

    setLoadingOlderMessages(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const { data } = await axios.get(`${server}/chat/messages/${activeChat._id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: DM_OLDER_PAGE_SIZE, before: page.nextBefore },
      });

      const rawMessages = Array.isArray(data) ? data : data.messages || [];
      const pageInfo = Array.isArray(data)
        ? { hasMore: false, nextBefore: null }
        : data.pageInfo || { hasMore: false, nextBefore: null };
      const processed = processFetchedMessages(rawMessages, auth.currentUser?.uid, currentUserInfo?._id);

      if (processed.length > 0) {
        setMessages((prev) => {
          const merged = [...processed, ...prev];
          return merged.filter(
            (item, idx, arr) => arr.findIndex((x) => String(x._id) === String(item._id)) === idx
          );
        });
      }

      messagePageByChannelRef.current[activeChat._id] = {
        hasMore: Boolean(pageInfo.hasMore),
        nextBefore: pageInfo.nextBefore || null,
      };
      setHasMoreOlderMessages(Boolean(pageInfo.hasMore));
      return processed.length;
    } catch (error) {
      console.error("Older history error:", error);
      return 0;
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [activeChat, loadingOlderMessages, processFetchedMessages, currentUserInfo, setMessages]);

  useEffect(() => {
    if (!activeChat?._id || !currentUserInfo?._id || activeChat.isTeacherChat) return;

    const markVisibleChatAsSeen = () => {
      if (document.hidden || !document.hasFocus()) return;
      socket.emit("mark_messages_seen", {
        channelId: activeChat._id,
        userId: currentUserInfo._id
      });
      markAsRead(activeChat._id);
    };

    markVisibleChatAsSeen();
    document.addEventListener("visibilitychange", markVisibleChatAsSeen);
    window.addEventListener("focus", markVisibleChatAsSeen);

    return () => {
      document.removeEventListener("visibilitychange", markVisibleChatAsSeen);
      window.removeEventListener("focus", markVisibleChatAsSeen);
    };
  }, [activeChat, currentUserInfo, markAsRead]);

  const handleSendMessage = useCallback((gifUrl = null, textOverride = null, attachment = null) => {
    const textToSend = textOverride !== null ? textOverride : newMessage;

    if (!textToSend.trim() && !gifUrl && !attachment) return;
    const messageType = attachment?.kind ? attachment.kind : "text";
    const payload = {
      channelId: activeChat._id,
      text: attachment ? (textToSend || attachment.name || "") : textToSend,
      gifUrl: gifUrl,
      type: messageType,
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
      senderId: currentUserInfo._id,
      senderProfile: currentUserInfo.profile,
      firebaseUid: auth.currentUser.uid,
    };
    socket.emit("send_message", payload);
    setNewMessage("");
  }, [activeChat, currentUserInfo, newMessage]);

  const handleDeleteMessage = useCallback(async (messageId, type) => {
    try {
      const token = await auth.currentUser.getIdToken();
      if (type === "me") {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
      await axios.put(
        `${server}/chat/message/delete`,
        { messageId, type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }, [setMessages]);

  const lastProcessedTimestamp = useRef(null);

  useEffect(() => {
    console.log("📍 Chat received location.state:", location.state);

    if (location.state?.timestamp && location.state.timestamp === lastProcessedTimestamp.current) {
      return; // Already processed this routing intent
    }

    const handleAutoOpen = async () => {
      let openAssignmentId = null;
      let focusAssignmentId = null;
      let initialTab = null;
      let timestamp = null;
      if (location.state?.openAssignmentId) {
        openAssignmentId = location.state.openAssignmentId;
        initialTab = location.state.initialTab;
        timestamp = location.state.timestamp;
      }
      if (location.state?.focusAssignmentId) {
        focusAssignmentId = location.state.focusAssignmentId;
        timestamp = location.state.timestamp;
      }

      let activeChatId = location.state?.activeChatId;

      if (location.state?.resolveDoubtReply) {
        const notif = location.state.resolveDoubtReply;
        const isBroadcast = notif.replyMode === "broadcast";
        timestamp = location.state.timestamp;

        activeChatId = `teacher-${notif.classroomId}-${notif.teacherId}`;

        if (isBroadcast) {
          focusAssignmentId = notif.relatedId;
        } else {
          openAssignmentId = notif.relatedId;
          initialTab = "doubts";
        }
      }

      if (activeChatId) {
        console.log("📍 Chat: Auto-opening chat:", activeChatId);

        let targetId = activeChatId;
        let targetChat = allChats.find(c => c._id === targetId);

        if (!targetChat) {
          console.log("📍 Chat: Target not found in current list, fetching...");
          const freshChats = await fetchChats();
          targetChat = freshChats?.find(c => c._id === targetId);
        }

        if (targetChat) {
          console.log("📍 Chat: Opening:", targetChat);
          if (targetChat.isTeacherChat) {
            handleOpenTeacherChat(targetChat);
          } else {
            handleOpenChat(targetChat);
          }

          setTimeout(() => {
            const el = document.getElementById(`chat-item-${targetChat._id}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 1000);
        } else {
          console.warn("📍 Chat: Target chat still not found after fetch.");
        }

        if (location.state?.timestamp) {
          lastProcessedTimestamp.current = location.state.timestamp;
        }

        // Pass openAssignmentId via state so ChatWindow can see it
        navigate(location.pathname, { replace: true, state: (openAssignmentId || focusAssignmentId) ? { initialAssignmentId: openAssignmentId, focusAssignmentId: focusAssignmentId, initialTab: initialTab, timestamp: timestamp } : {} });
      } else if (openAssignmentId || focusAssignmentId) {
        if (location.state?.timestamp) {
          lastProcessedTimestamp.current = location.state.timestamp;
        }
        // Just storing it temporarily if there was no activeChatId but an openAssignmentId
        navigate(location.pathname, { replace: true, state: { initialAssignmentId: openAssignmentId, focusAssignmentId: focusAssignmentId, initialTab: initialTab, timestamp: timestamp } });
      }
    };
    handleAutoOpen();
  }, [location.state, allChats, handleOpenChat, handleOpenTeacherChat, navigate, fetchChats]);

  const isRestricted = useMemo(() => {
    if (role !== "student") return false;
    if (!activeChat || activeChat.isTeacherChat || activeChat.type === "project_group") return false;

    const otherUser = activeChat.participants.find(p => p._id !== currentUserInfo?._id);
    if (!otherUser) return false;

    const otherId = otherUser._id.toString();
    const isFriend = currentUserInfo?.friends?.some(fid => fid.toString() === otherId);
    return !isFriend;
  }, [role, activeChat, currentUserInfo]);

  const openDoubtModal = async (announcementMsg) => {
    const announcement = {
      _id: announcementMsg._id,
      content: announcementMsg.text,
      senderName: announcementMsg.sender.profile.name
    };
    setActiveAnnouncement(announcement);
    setShowDoubtModal(true);
    setTimeout(() => doubtInputRef.current?.focus(), 100);

    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      const { data } = await axios.get(
        `${server}/classroom/comments/${announcement._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDoubts(data);
    } catch (error) {
      console.error("Error fetching doubts", error);
    }
  };

  const sendDoubt = async () => {
    if (!doubtInput.trim()) return;
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      const { data } = await axios.post(
        `${server}/classroom/comment`,
        {
          announcementId: activeAnnouncement._id,
          content: doubtInput,
          replyTo: replyToComment?._id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDoubts([...doubts, data]);
      setDoubtInput("");
      setReplyToComment(null);
    } catch (error) {
      console.error("Error sending doubt", error);
    }
  };

  const [friendToUnfriend, setFriendToUnfriend] = useState(null);

  const initiateUnfriend = useCallback((user) => {
    setFriendToUnfriend(user);
  }, []);

  const executeUnfriend = useCallback(async () => {
    if (role !== "student" || !friendToUnfriend) return;
    try {
      const token = await auth.currentUser.getIdToken();
      await axios.post(`${server}/friends/remove`,
        { targetId: friendToUnfriend._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Unfriended successfully");

      const targetId = friendToUnfriend._id?.toString();
      if (activeChat?.participants?.some((p) => p._id?.toString() === targetId)) {
        setActiveChat(null);
        setMessages([]);
      }
      fetchChats();
      refreshUser();
      setFriendToUnfriend(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to unfriend");
    }
  }, [activeChat, friendToUnfriend, fetchChats, refreshUser, role, setActiveChat, setMessages]);

  useEffect(() => {
    if (role !== "student") return;

    const handleAssignmentDoubtReply = (payload) => {
      if (!payload) return;
      if (!activeChat?.isTeacherChat) return;

      const activeTeacherId = activeChat?.participant?._id;
      if (activeTeacherId && payload.teacherId && payload.teacherId !== activeTeacherId) return;

      const bubble = buildTeacherReplyMessage(payload, activeChat.participant);
      if (!bubble) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === bubble._id)) return prev;
        return [...prev, bubble];
      });
    };

    socket.on("assignment_doubt_reply", handleAssignmentDoubtReply);
    return () => socket.off("assignment_doubt_reply", handleAssignmentDoubtReply);
  }, [role, activeChat, setMessages, buildTeacherReplyMessage]);

  return (
    <div className="flex w-full h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* LEFT SIDEBAR */}
      <ChatSidebar
        isHidden={mobileView === "chat"}
        role={role}
        peersChats={peersChats}
        teachersChats={teachersChats}
        activeChat={activeChat}
        onOpenChat={handleOpenChat}
        onOpenTeacherChat={handleOpenTeacherChat}
        loading={loading}
        currentUserInfo={currentUserInfo}
        onChatAdded={handleChatAdded}
        onFriendAction={handleFriendAction}
        markAsRead={markAsRead}
        classmates={classmates}

        isAddChatOpen={isAddChatOpen}
        setIsAddChatOpen={setIsAddChatOpen}
      />

      {/* RIGHT WINDOW */}
      <ChatWindow
        isHidden={mobileView === "list"}
        activeChat={activeChat}
        activeChatTitle={activeChatTitle}
        messages={messages}
        currentUserInfo={currentUserInfo}
        onBack={() => setMobileView("list")}
        onProfileClick={() => {
          const other = activeChat?.participants?.find(p => p.firebaseUid !== auth.currentUser?.uid);
          if (other) {
            setProfileUser(other);
          }
        }}
        onUnfriend={initiateUnfriend}
        isRestricted={isRestricted}
        role={role}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
        onOpenDoubt={openDoubtModal}
        messagesEndRef={messagesEndRef}
        autoOpenAssignmentId={location.state?.initialAssignmentId}
        focusAssignmentId={location.state?.focusAssignmentId}
        autoOpenTab={location.state?.initialTab}
        autoOpenTimestamp={location.state?.timestamp}
        hasMoreOlder={hasMoreOlderMessages}
        isLoadingOlder={loadingOlderMessages}
        onLoadOlder={loadOlderActiveChatMessages}
      />

      {/* MODALS */}
      <ChatProfileModal
        user={profileUser}
        onClose={() => setProfileUser(null)}
        role={role}
      />

      <DoubtModal
        isOpen={showDoubtModal}
        onClose={() => setShowDoubtModal(false)}
        activeAnnouncement={activeAnnouncement}
        doubts={doubts}
        replyToComment={replyToComment}
        setReplyToComment={setReplyToComment}
        doubtInput={doubtInput}
        setDoubtInput={setDoubtInput}
        onSendDoubt={sendDoubt}
        doubtInputRef={doubtInputRef}
      />

      {/* UNFRIEND CONFIRMATION MODAL */}
      {friendToUnfriend && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-2">Unfriend {friendToUnfriend.profile?.name || "User"}?</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to remove this friend? You will need to send a request again to chat.</p>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setFriendToUnfriend(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={executeUnfriend}
                className="flex-1 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-200">
                Yes, Unfriend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

