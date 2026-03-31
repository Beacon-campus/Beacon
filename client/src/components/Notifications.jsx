import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useHomeData } from "../context/HomeDataContext";
import apiClient from "../services/apiClient";
import { auth } from "../firebase/firebase";
import { clearPageCache, clearPageCacheByPrefix, getOrFetchPageCache } from "../services/pageCache.service";
import LoadingState from "./ui/LoadingState";

// Standard Icons
const BellIcon = () => <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>;
const CheckAllIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>;

import socket from "../services/socket.service";



export default function Notifications() {
  const { user: currentUserInfo, refreshUser } = useAuth();
  const { notificationsAll, fetchNotificationsAll } = useHomeData();
  const userCacheKey = auth.currentUser?.uid || currentUserInfo?.uid || "guest";
  const [notifications, setNotifications] = useState([]);
  const [pendingFriendUsers, setPendingFriendUsers] = useState([]);
  const [filter, setFilter] = useState("all"); // "all" | "friend_request"
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  // Determine base path for chat redirection
  const isTeacher = location.pathname.startsWith("/teacher");
  const isStudent = currentUserInfo?.role === "student";
  // Chat is hosted in the Community page
  const chatPath = isTeacher ? "/teacher/community" : "/student/community";

  const palettes = {
    friend: {
      icon: "text-violet-600",
      bar: "bg-violet-500",
      unreadBg: "bg-violet-50/40",
      unreadHover: "hover:bg-violet-50/60",
      link: "text-violet-600",
    },
    grouped: {
      icon: "text-slate-600",
      bar: "bg-slate-500",
      unreadBg: "bg-slate-50/40",
      unreadHover: "hover:bg-slate-50/60",
      link: "text-slate-600",
    },
    doubt: {
      icon: "text-amber-600",
      bar: "bg-amber-500",
      unreadBg: "bg-amber-50/40",
      unreadHover: "hover:bg-amber-50/60",
      link: "text-amber-600",
    },
    doubtReply: {
      icon: "text-cyan-600",
      bar: "bg-cyan-500",
      unreadBg: "bg-cyan-50/40",
      unreadHover: "hover:bg-cyan-50/60",
      link: "text-cyan-600",
    },
    submitted: {
      icon: "text-emerald-600",
      bar: "bg-emerald-500",
      unreadBg: "bg-emerald-50/40",
      unreadHover: "hover:bg-emerald-50/60",
      link: "text-emerald-600",
    },
    published: {
      icon: "text-indigo-600",
      bar: "bg-indigo-500",
      unreadBg: "bg-indigo-50/40",
      unreadHover: "hover:bg-indigo-50/60",
      link: "text-indigo-600",
    },
    default: {
      icon: "text-blue-600",
      bar: "bg-blue-500",
      unreadBg: "bg-blue-50/40",
      unreadHover: "hover:bg-blue-50/60",
      link: "text-blue-600",
    },
  };

  const getNotifPalette = (notif, { isFriendRequest, isFriendRequestGroup }) => {
    if (isFriendRequest || isFriendRequestGroup || notif?.type?.startsWith("FRIEND_")) return palettes.friend;
    if (notif?.isGrouped) return palettes.grouped;
    if (notif?.type === "ASSIGNMENT_DOUBT") return palettes.doubt;
    if (notif?.type === "ASSIGNMENT_DOUBT_REPLY") return palettes.doubtReply;
    if (notif?.type === "ASSIGNMENT_SUBMITTED") return palettes.submitted;
    if (notif?.type === "ASSIGNMENT_PUBLISHED") return palettes.published;
    return palettes.default;
  };

  const getSubNotifPalette = (type) => {
    if (type === "ASSIGNMENT_SUBMITTED") return palettes.submitted;
    if (type === "ASSIGNMENT_DOUBT") return palettes.doubt;
    return palettes.default;
  };

  const refreshNotifications = useCallback(async () => {
    try {
      setLoading(true);
      clearPageCacheByPrefix("notifications:", userCacheKey);
      await fetchNotificationsAll(true);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  }, [fetchNotificationsAll, userCacheKey]);

  const fetchPendingFriendRequests = useCallback(async (force = false, receivedOverride = null) => {
    try {
      if (!auth.currentUser || currentUserInfo?.role !== "student") {
        setPendingFriendUsers([]);
        return;
      }

      const received = receivedOverride || currentUserInfo?.friendRequests?.received || [];
      if (!received.length) {
        setPendingFriendUsers([]);
        return;
      }

      const data = await getOrFetchPageCache(
        `notifications:friend-requests:${received.join(",")}`,
        userCacheKey,
        async () => (await apiClient.post("/friends/get-users", { userIds: received })).data || [],
        { ttlMs: 60_000, force }
      );

      const byId = new Map((data || []).map((u) => [u._id?.toString(), u]));
      const ordered = received
        .map((id) => byId.get(id.toString()))
        .filter(Boolean);

      setPendingFriendUsers(ordered);
    } catch (error) {
      console.error("Failed to fetch pending friend requests", error);
    }
  }, [currentUserInfo, userCacheKey]);

  const invalidateFriendCaches = useCallback(() => {
    clearPageCache("auth:me", userCacheKey);
    clearPageCache("chat:my-channels", userCacheKey);
    clearPageCacheByPrefix("notifications:", userCacheKey);
  }, [userCacheKey]);

  useEffect(() => {
    if (!currentUserInfo?._id) return;
    fetchNotificationsAll(true)
      .catch(() => {})
      .finally(() => setLoading(false));
    fetchPendingFriendRequests(true);
  }, [fetchNotificationsAll, currentUserInfo?._id, currentUserInfo?.role, fetchPendingFriendRequests]);

  useEffect(() => {
    const nonFriendNotifications = (notificationsAll || []).filter(
      (n) => !["FRIEND_REQUEST", "FRIEND_REQUEST_RECEIVED"].includes(n.type)
    );
    setNotifications(nonFriendNotifications);
  }, [notificationsAll]);

  // --- REAL-TIME UPDATES ---
  useEffect(() => {
    const handleEvent = (data) => {
      if (!data?.type) return;
      if (
        [
          "FRIEND_REQUEST",
          "FRIEND_REQUEST_RECEIVED",
          "FRIEND_REQUEST_ACCEPTED",
          "FRIEND_REQUEST_DECLINED",
          "FRIEND_REMOVED",
        ].includes(data.type)
      ) {
        invalidateFriendCaches();
        refreshUser(true).finally(() => {
          refreshNotifications();
          fetchPendingFriendRequests(true);
        });
      }
    };

    const handleNewNotification = (notif) => {
      if (notif?.type?.startsWith("FRIEND_")) {
        invalidateFriendCaches();
        fetchPendingFriendRequests(true);
        return;
      }
      refreshNotifications();
      if (!notif?.type) return;
      // Friend request toasts are handled by socket manager; this is for persisted notifications.
      const message = notif.title || notif.content || "New notification";
      toast(message, { icon: "🔔" });
    };

    socket.on("event", handleEvent);
    socket.on("new_notification", handleNewNotification);
    return () => {
      socket.off("event", handleEvent);
      socket.off("new_notification", handleNewNotification);
    };
  }, [currentUserInfo, refreshUser, userCacheKey, fetchPendingFriendRequests, invalidateFriendCaches, refreshNotifications]);

  const deleteAllNotifications = async () => {
    try {
      await apiClient.delete("/notifications/all");
      invalidateFriendCaches();

      setNotifications([]);
      await refreshNotifications();
      toast.success("All notifications deleted");
    } catch {
      toast.error("Failed to delete all");
    }
  };

  const openDmWithUser = async (targetId) => {
    clearPageCache("chat:my-channels", userCacheKey);
    const { data } = await apiClient.post("/chat/create-by-id", { targetId });
    navigate(chatPath, { state: { activeChatId: data._id, timestamp: Date.now() } });
  };

  const handleAcceptRequest = async (requesterId, openChatAfter = false) => {
    try {
      await apiClient.post("/friends/accept", { requesterId });
      invalidateFriendCaches();
      setPendingFriendUsers((prev) => prev.filter((user) => user._id !== requesterId));
      toast.success("Friend request accepted!");
      await refreshUser(true);
      await fetchPendingFriendRequests(true, []);
      await refreshNotifications();
      if (openChatAfter) {
        await openDmWithUser(requesterId);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept");
    }
  };

  const handleDeclineRequest = async (requesterId) => {
    try {
      await apiClient.post("/friends/decline", { requesterId });
      invalidateFriendCaches();
      setPendingFriendUsers((prev) => prev.filter((user) => user._id !== requesterId));
      toast.success("Request removed");
      await refreshUser(true);
      await fetchPendingFriendRequests(true, []);
      await refreshNotifications();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to decline");
    }
  };

  const toggleGroupExpand = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Filter Logic
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "friend_request") return !!n && false;
    return true;
  });

  const friendRequestNotification =
    currentUserInfo?.role === "student" && pendingFriendUsers.length > 0
      ? {
        id: "friend-request-group",
        type: "FRIEND_REQUEST_GROUP",
        title: `Friend Requests (${pendingFriendUsers.length})`,
        content:
          pendingFriendUsers.length === 1
            ? `${pendingFriendUsers[0].profile?.name || "Someone"} sent you a friend request`
            : `${pendingFriendUsers.length} pending friend requests`,
        timestamp: new Date().toISOString(),
        read: false,
        requests: pendingFriendUsers,
      }
      : null;

  const unreadCount = notifications.filter(n => !n.read).length + pendingFriendUsers.length;

  // Group NEW_ASSIGNMENT_DOUBT notifications by relatedId (assignment ID)
  const groupedNotifications = [];
  const assignmentDoubtGroups = {};

  filteredNotifications.forEach(notif => {
    const isAssignmentActivity = (notif.type === "ASSIGNMENT_DOUBT" || notif.type === "ASSIGNMENT_SUBMITTED");

    if (isAssignmentActivity && notif.relatedId) {
      // Extract assignment title based on notification type string patterns
      let assignmentTitle = "this assignment";
      if (notif.content.includes("on: ")) {
        assignmentTitle = notif.content.split("on: ")[1];
      } else if (notif.content.includes("submitted: ")) {
        assignmentTitle = notif.content.split("submitted: ")[1];
      } else if (notif.content.includes("submitted quiz: ")) {
        assignmentTitle = notif.content.split("submitted quiz: ")[1];
      }

      if (!assignmentDoubtGroups[notif.relatedId]) {
        assignmentDoubtGroups[notif.relatedId] = {
          ...notif,
          isGrouped: true,
          activityCount: 1,
          unread: !notif.read,
          senders: [notif.content.split(" ")[0]], // Extract sender name roughly (e.g., "Student asked...")
          groupNotificationIds: [notif.id || notif._id],
          subNotifications: [notif],
          hasDoubts: notif.type === "ASSIGNMENT_DOUBT",
          hasSubmissions: notif.type === "ASSIGNMENT_SUBMITTED",
          assignmentTitle: assignmentTitle
        };
        groupedNotifications.push(assignmentDoubtGroups[notif.relatedId]);
      } else {
        const group = assignmentDoubtGroups[notif.relatedId];
        group.activityCount += 1;
        if (!notif.read) group.unread = true;
        const sender = notif.content.split(" ")[0];
        if (!group.senders.includes(sender)) {
          group.senders.push(sender);
        }
        if (notif.type === "ASSIGNMENT_DOUBT") group.hasDoubts = true;
        if (notif.type === "ASSIGNMENT_SUBMITTED") group.hasSubmissions = true;

        group.groupNotificationIds.push(notif.id || notif._id);
        group.subNotifications.push(notif);
        // Keep the most recent timestamp
        if (new Date(notif.timestamp) > new Date(group.timestamp)) {
          group.timestamp = notif.timestamp;
        }
      }
    } else {
      groupedNotifications.push(notif);
    }
  });

  const finalNotifications = [];
  if (filter === "all") {
    if (friendRequestNotification) finalNotifications.push(friendRequestNotification);
    finalNotifications.push(...groupedNotifications);
  } else if (filter === "friend_request") {
    if (friendRequestNotification) finalNotifications.push(friendRequestNotification);
  } else {
    finalNotifications.push(...groupedNotifications);
  }

  return (
    <div className="min-h-full h-auto min-[769px]:h-full w-full p-2">
      <div className="min-h-full min-[769px]:h-full w-full premium-card p-4 min-[426px]:p-5 min-[769px]:p-6 flex flex-col gap-5 min-[769px]:gap-6 overflow-hidden">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <BellIcon />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-none">Notifications</h1>
                <p className="text-xs text-gray-500 mt-1">You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 min-[426px]:gap-4">
            {/* ================= ICON-ONLY PILL FILTERS ================= */}
            {!isTeacher && (
              <div className="bg-gray-100 p-1 rounded-full flex items-center shadow-inner gap-1">
                <button
                  onClick={() => setFilter("all")}
                  title="All Notifications"
                  className={`flex items-center justify-center rounded-full transition-all duration-300 ease-in-out w-9 h-9
                          ${filter === "all" ? "bg-[#0F172A] text-white shadow-md transform scale-105" : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"}
                      `}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                </button>

                {isStudent && (
                  <button
                    onClick={() => setFilter("friend_request")}
                    title="Friend Requests"
                    className={`flex items-center justify-center rounded-full transition-all duration-300 ease-in-out w-9 h-9
                          ${filter === "friend_request" ? "bg-[#0F172A] text-white shadow-md transform scale-105" : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"}
                      `}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  </button>
                )}
              </div>
            )}

            <button
              onClick={deleteAllNotifications}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-100 transition-all w-full min-[426px]:w-auto">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              Delete all
            </button>
          </div>
        </div>

        {/* ================= NOTIFICATION LIST ================= */}
        <div className="flex-1 overflow-y-auto pr-1 min-[426px]:pr-2 soft-scrollbar space-y-3">

          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <LoadingState size="sm" />
            </div>
          ) : finalNotifications.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-gray-400">
              <p>No notifications found</p>
            </div>
          ) : (
            finalNotifications.map((notif, idx) => {
              const isFriendRequest = notif.type === "FRIEND_REQUEST" || notif.type === "FRIEND_REQUEST_RECEIVED";
              const isFriendRequestGroup = notif.type === "FRIEND_REQUEST_GROUP";
              const palette = getNotifPalette(notif, { isFriendRequest, isFriendRequestGroup });

              // If accepted locally, show specific UI
              const isAccepted = notif.isAccepted;

              return (
                <React.Fragment key={notif.id || notif._id || idx}>
                  <div
                    onClick={(e) => {
                      // Prevent clicks inside dynamic content/buttons from firing this
                      if (e.target.closest('button') || e.target.closest('a')) return;

                      if (!isFriendRequest && !isFriendRequestGroup && !isAccepted) {
                        if (notif.type === "ASSIGNMENT_SUBMITTED" || notif.type === "ASSIGNMENT_DOUBT_REPLY" || notif.type === "ASSIGNMENT_DOUBT") {
                          if (isTeacher) {
                            navigate(`/teacher/community/publish-assignment/${notif.classroomId}`, { state: { openAssignmentId: notif.relatedId }});
                          } else {
                            navigate(chatPath, { state: { openAssignmentId: notif.relatedId, initialTab: "doubts", timestamp: Date.now() }});
                          }
                        } else if (notif.type === "ASSIGNMENT_PUBLISHED") {
                          navigate(chatPath, { state: { openAssignmentId: notif.relatedId, initialTab: "details", timestamp: Date.now() }});
                        } else if (notif.link) {
                          navigate(notif.link);
                        }
                      } else if (isAccepted) {
                        // Automatically open chat if clicked when accepted
                        openDmWithUser(notif.relatedId);
                      }
                    }}
                    className={`group relative border-b border-gray-100 p-4 pl-5 min-[426px]:pl-6 flex items-start gap-3 min-[426px]:gap-4 transition-all duration-200 ${!isFriendRequestGroup && (!isFriendRequest || isAccepted) ? "cursor-pointer" : ""}
                            ${(!notif.read && !isAccepted) || notif.unread
                        ? `${palette.unreadBg} ${palette.unreadHover}`
                        : "bg-transparent hover:bg-gray-50"
                      }`}
                  >
                    {/* Unread Indicator Bar */}
                    {((!notif.read && !isAccepted) || notif.unread) && (
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${palette.bar}`}></div>
                    )}

                    {/* Icon Container */}
                    <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center
                              ${(!notif.read && !isAccepted) || notif.unread ? "bg-white shadow-sm" : "bg-gray-100"}
                          `}>
                      {isFriendRequest || isFriendRequestGroup ? (
                        <svg className={`w-6 h-6 ${palette.icon} fill-current`} viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m23.99,11.042c.071.879-.246,1.74-.869,2.364-1.489,1.415-3.292,3.117-3.532,3.291-.178.13-.384.192-.588.192-.309,0-.613-.143-.809-.41-.322-.44-.23-1.056.201-1.385.23-.19,1.883-1.745,3.332-3.121.189-.19.295-.477.271-.771-.024-.297-.174-.56-.424-.739-.38-.274-.976-.19-1.355.189-.286.286-.715.371-1.088.217-.373-.154-.617-.517-.619-.921l-.02-6.201c0-.415-.335-.749-.747-.749-.2,0-.388.078-.53.22-.13.131-.199.304-.209.487l-.004,2.292c0,.552-.448,1-1,1s-1-.448-1-1l.006-3.256c0-.41-.334-.744-.746-.744-.2,0-.388.078-.528.22-.141.142-.218.33-.217.53l-.015,1.263c-.006.465-.332.866-.787.965-.452.101-.918-.128-1.117-.55-.096-.203-.474-.43-.836-.43-.289,0-.556.169-.679.43-.236.5-.833.712-1.332.476s-.712-.833-.476-1.332c.572-1.21,2.039-1.822,3.313-1.458.114-.486.363-.938.728-1.305.519-.521,1.21-.809,1.946-.809.971,0,1.821.51,2.31,1.272.363-.172.759-.272,1.173-.272,1.515,0,2.747,1.231,2.747,2.746l.015,4.607c.775-.136,1.586.02,2.237.489.722.52,1.177,1.322,1.248,2.201Zm-8.791-2.234c.52.522.805,1.216.801,1.953v7.239c0,3.309-2.691,6-6,6h-1.592c-1.804,0-3.5-.702-4.776-1.979l-2.726-2.599c-.64-.64-.957-1.502-.886-2.381.071-.878.525-1.681,1.248-2.201.65-.469,1.46-.624,2.237-.488l.015-4.61c0-1.511,1.232-2.743,2.747-2.743.414,0,.81.1,1.173.273.488-.763,1.338-1.273,2.31-1.273.736,0,1.427.288,1.947.81.369.371.613.831.725,1.33.263-.084.538-.142.829-.142.737,0,1.429.288,1.949.811Zm-1.199,1.948c0-.206-.077-.395-.218-.538-.142-.143-.331-.221-.532-.221-.414,0-.75.336-.75.749,0,.009-.005.017-.005.026v3.228c0,.552-.447,1-1,1s-1-.447-1-1v-5.246c0-.205-.076-.393-.217-.535-.141-.142-.329-.22-.528-.22-.411,0-.746.334-.746.744l.01,5.256c0,.553-.448,1-1,1s-1-.447-1-1l-.008-4.29c-.009-.184-.078-.358-.209-.489-.141-.142-.33-.22-.53-.22-.412,0-.747.334-.747.746l-.02,6.204c-.001.404-.246.768-.619.922-.373.153-.803.068-1.088-.218-.381-.381-.976-.463-1.356-.189-.249.18-.399.442-.423.739-.023.294.082.581.29.789l2.726,2.599c.915.915,2.109,1.409,3.379,1.409h1.592c2.206,0,4-1.794,4-4v-7.244Z" />
                        </svg>
                      ) : notif.isGrouped ? (
                        <svg className={`w-6 h-6 ${palette.icon} fill-current`} viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M24,10.5v8c0,3.03-2.47,5.5-5.5,5.5H5.5c-3.03,0-5.5-2.47-5.5-5.5V8.5C0,5.47,2.47,3,5.5,3H13.5c.83,0,1.5,.67,1.5,1.5s-.67,1.5-1.5,1.5H5.5c-.96,0-1.79,.54-2.21,1.33l6.94,6.94c.95,.95,2.59,.95,3.54,0,.02-.02,2.75-2.4,2.75-2.4,.62-.54,1.57-.48,2.12,.15,.54,.62,.48,1.57-.15,2.12l-2.64,2.3c-1.03,1.01-2.4,1.57-3.85,1.57s-2.85-.57-3.89-1.61L3,11.28v7.22c0,1.38,1.12,2.5,2.5,2.5h13c1.38,0,2.5-1.12,2.5-2.5V10.5c0-.83,.67-1.5,1.5-1.5s1.5,.67,1.5,1.5Zm-3.5-3.5c1.93,0,3.5-1.57,3.5-3.5s-1.57-3.5-3.5-3.5-3.5,1.57-3.5,3.5,1.57,3.5,3.5,3.5Z" />
                        </svg>
                      ) : notif.type === "ASSIGNMENT_DOUBT_REPLY" ? (
                        <svg className={`w-6 h-6 ${palette.icon} fill-current`} viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9,11c-.552,0-1-.447-1-1,0-1.308,1.038-1.879,1.481-2.123,.29-.159,.595-.535,.502-1.066-.069-.392-.402-.725-.793-.793-.306-.056-.602,.022-.832,.216-.228,.19-.358,.47-.358,.767,0,.553-.448,1-1,1s-1-.447-1-1c0-.889,.391-1.727,1.072-2.299,.681-.572,1.577-.814,2.463-.653,1.209,.211,2.204,1.205,2.417,2.417,.223,1.272-.382,2.543-1.506,3.164-.447,.246-.447,.318-.447,.371,0,.553-.448,1-1,1Zm0,1c-.69,0-1.25,.56-1.25,1.25s.56,1.25,1.25,1.25,1.25-.56,1.25-1.25-.56-1.25-1.25-1.25Zm10.996-2.92c-.006,.769-.091,1.518-.248,2.242,1.371,1.101,2.252,2.787,2.252,4.678v5c0,.552-.448,1-1,1h-5c-1.891,0-3.577-.881-4.678-2.252-.724,.156-1.473,.242-2.242,.248,1.385,2.389,3.965,4.004,6.92,4.004h5c1.657,0,3-1.343,3-3v-5c0-2.955-1.615-5.535-4.004-6.92Zm-2.019,.571c.185-2.613-.768-5.17-2.613-7.016S10.964-.167,8.349,.023C3.823,.343,0,4.589,0,9.296v5.038c0,2.021,1.642,3.666,3.661,3.666h4.477c5.187,0,9.509-3.667,9.839-8.349Zm-4.027-5.601c1.436,1.435,2.176,3.425,2.033,5.46-.253,3.578-3.772,6.489-7.845,6.489H3.661c-.916,0-1.661-.747-1.661-1.666v-5.038c0-3.696,2.972-7.029,6.49-7.278,.167-.012,.333-.018,.499-.018,1.858,0,3.644,.732,4.961,2.051Z" />
                        </svg>
                      ) : notif.type === "ASSIGNMENT_PUBLISHED" ? (
                        <svg className={`w-6 h-6 ${palette.icon} fill-current`} viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m15,2.766v-1.766c0-.553-.448-1-1-1s-1,.447-1,1v1h-2v-1c0-.553-.448-1-1-1s-1,.447-1,1v1h-2v-1c0-.553-.448-1-1-1s-1,.447-1,1v1h-2v-1c0-.553-.448-1-1-1s-1,.447-1,1v1.766c-.613.55-1,1.347-1,2.234v14c0,2.757,2.243,5,5,5h6c2.757,0,5-2.243,5-5V5c0-.886-.387-1.684-1-2.234Zm-1,16.234c0,1.654-1.346,3-3,3h-6c-1.654,0-3-1.346-3-3V5c0-.552.449-1,1-1h10c.551,0,1,.448,1,1v14Zm-2-11c0,.553-.448,1-1,1h-6c-.552,0-1-.447-1-1s.448-1,1-1h6c.552,0,1,.447,1,1Zm0,4c0,.553-.448,1-1,1h-6c-.552,0-1-.447-1-1s.448-1,1-1h6c.552,0,1,.447,1,1Zm-3,4c0,.553-.448,1-1,1h-3c-.552,0-1-.447-1-1s.448-1,1-1h3c.552,0,1,.447,1,1ZM21,0c-1.654,0-3,1.346-3,3v16.758c0,1.054.427,2.084,1.172,2.828l1.121,1.121c.195.195.451.293.707.293s.512-.098.707-.293l1.121-1.121c.745-.744,1.172-1.774,1.172-2.828V3c0-1.654-1.346-3-3-3Zm1,19.758c0,.526-.213,1.042-.586,1.414l-.414.414-.414-.414c-.373-.372-.586-.888-.586-1.414V3c0-.552.449-1,1-1s1,.448,1,1v16.758Z" />
                        </svg>
                      ) : (
                        <svg className={`w-6 h-6 ${palette.icon}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex flex-col min-[426px]:flex-row min-[426px]:items-center justify-between mb-1 gap-1 min-[426px]:gap-2">
                        <h3 className={`text-sm font-bold min-w-0 ${(!notif.read && !isAccepted) || notif.unread ? "text-gray-900" : "text-gray-700"}`}>
                          {isAccepted ? "Friend Request Accepted" : (notif.isGrouped ? `${notif.activityCount} New Activities` : (notif.title || (isFriendRequest ? "Friend Request" : "Notification")))}
                        </h3>
                        <span className="text-xs text-gray-400 font-medium whitespace-nowrap min-[426px]:ml-2">
                          {new Date(notif.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                        {isAccepted
                          ? `You are now friends with ${notif.content.replace("You received a friend request from ", "")}`
                          : isFriendRequestGroup
                            ? notif.content
                          : notif.isGrouped
                            ? <>{notif.senders.slice(0, 2).join(", ")}{notif.senders.length > 2 ? ` and ${notif.senders.length - 2} others` : ""} have {notif.hasDoubts && notif.hasSubmissions ? "submitted and asked doubts" : notif.hasSubmissions ? "submitted" : "asked doubts"} on <strong>{notif.assignmentTitle || "this assignment"}</strong>.</>
                            : (notif.content || notif.description)
                        }
                      </p>

                      {/* GROUPED FRIEND REQUESTS */}
                      {isFriendRequestGroup && (
                        <div className="mt-3 space-y-2">
                          {notif.requests.map((reqUser) => (
                            <div key={reqUser._id} className="flex flex-col min-[426px]:flex-row min-[426px]:items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{reqUser.profile?.name || "User"}</p>
                                <p className="text-xs text-gray-500 truncate">{reqUser.profile?.regno || ""}</p>
                              </div>
                              <div className="flex gap-2 shrink-0 flex-wrap">
                                <button
                                  onClick={() => handleAcceptRequest(reqUser._id)}
                                  aria-label="Accept friend request"
                                  title="Accept"
                                  className="text-xs font-bold bg-[#0F172A] text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M23,11H21V9a1,1,0,0,0-2,0v2H17a1,1,0,0,0,0,2h2v2a1,1,0,0,0,2,0V13h2a1,1,0,0,0,0-2Z" />
                                    <path d="M9,12A6,6,0,1,0,3,6,6.006,6.006,0,0,0,9,12ZM9,2A4,4,0,1,1,5,6,4,4,0,0,1,9,2Z" />
                                    <path d="M9,14a9.01,9.01,0,0,0-9,9,1,1,0,0,0,2,0,7,7,0,0,1,14,0,1,1,0,0,0,2,0A9.01,9.01,0,0,0,9,14Z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleAcceptRequest(reqUser._id, true)}
                                  aria-label="Accept and chat"
                                  title="Accept + Chat"
                                  className="text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="m21.499,0l-5,.002c-1.375,0-2.499,1.126-2.499,2.5v6.852c.001,1.069,1.206,1.695,2.081,1.081l2.047-1.436h3.372c1.381,0,2.5-1.119,2.5-2.5v-4C24,1.119,22.88,0,21.499,0Zm.484,4.24l-2.084,2.147c-.796.823-2.118.817-2.905-.015l-.769-.813c-.367-.388-.364-.995.006-1.379.395-.411,1.054-.408,1.445.006l.777.821,2.092-2.156c.391-.405,1.04-.407,1.433-.004.378.387.38,1.004.004,1.394Zm-14.483,7.76c3.032,0,5.5-2.467,5.5-5.5S10.532,1,7.5,1,2,3.467,2,6.5s2.468,5.5,5.5,5.5Zm0-9c1.93,0,3.5,1.57,3.5,3.5s-1.57,3.5-3.5,3.5-3.5-1.57-3.5-3.5,1.57-3.5,3.5-3.5Zm7.5,18.5v1.5c0,.552-.447,1-1,1s-1-.448-1-1v-1.5c0-3.033-2.468-5.5-5.5-5.5s-5.5,2.467-5.5,5.5v1.5c0,.552-.447,1-1,1s-1-.448-1-1v-1.5c0-4.136,3.364-7.5,7.5-7.5s7.5,3.364,7.5,7.5Z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeclineRequest(reqUser._id)}
                                  aria-label="Decline friend request"
                                  title="Decline"
                                  className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="m9 12a6 6 0 1 0 -6-6 6.006 6.006 0 0 0 6 6zm0-10a4 4 0 1 1 -4 4 4 4 0 0 1 4-4zm9 21a1 1 0 0 1 -2 0 7 7 0 0 0 -14 0 1 1 0 0 1 -2 0 9 9 0 0 1 18 0zm5.707-8.707a1 1 0 1 1 -1.414 1.414l-1.793-1.793-1.793 1.793a1 1 0 0 1 -1.414-1.414l1.793-1.793-1.793-1.793a1 1 0 0 1 1.414-1.414l1.793 1.793 1.793-1.793a1 1 0 0 1 1.414 1.414l-1.793 1.793z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ACTION BUTTONS (Friend Request) */}
                      {isFriendRequest && !isAccepted && !isFriendRequestGroup && (
                        <div className="mt-3 flex gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAcceptRequest(notif.relatedId); }}
                            aria-label="Accept friend request"
                            title="Accept"
                            className="text-xs font-bold bg-[#0F172A] text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M23,11H21V9a1,1,0,0,0-2,0v2H17a1,1,0,0,0,0,2h2v2a1,1,0,0,0,2,0V13h2a1,1,0,0,0,0-2Z" />
                              <path d="M9,12A6,6,0,1,0,3,6,6.006,6.006,0,0,0,9,12ZM9,2A4,4,0,1,1,5,6,4,4,0,0,1,9,2Z" />
                              <path d="M9,14a9.01,9.01,0,0,0-9,9,1,1,0,0,0,2,0,7,7,0,0,1,14,0,1,1,0,0,0,2,0A9.01,9.01,0,0,0,9,14Z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeclineRequest(notif.relatedId); }}
                            aria-label="Decline friend request"
                            title="Decline"
                            className="text-xs font-bold bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="m9 12a6 6 0 1 0 -6-6 6.006 6.006 0 0 0 6 6zm0-10a4 4 0 1 1 -4 4 4 4 0 0 1 4-4zm9 21a1 1 0 0 1 -2 0 7 7 0 0 0 -14 0 1 1 0 0 1 -2 0 9 9 0 0 1 18 0zm5.707-8.707a1 1 0 1 1 -1.414 1.414l-1.793-1.793-1.793 1.793a1 1 0 0 1 -1.414-1.414l1.793-1.793-1.793-1.793a1 1 0 0 1 1.414-1.414l1.793 1.793 1.793-1.793a1 1 0 0 1 1.414 1.414l-1.793 1.793z" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* MESSAGE BUTTON (Accepted State) */}
                      {isAccepted && (
                        <div className="mt-3 flex gap-3">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                // Create or Get Chat ID
                                const { data } = await apiClient.post("/chat/create-by-id", {
                                  targetId: notif.relatedId,
                                });

                                // Navigate with activeChatId
                                navigate(chatPath, {
                                  state: { activeChatId: data._id }
                                });
                              } catch (error) {
                                console.error("Failed to open chat", error);
                                toast.error("Failed to open chat");
                              }
                            }}
                            className="text-xs font-bold bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            Message
                          </button>
                        </div>
                      )}
                      {/* ASSIGNMENT ACTIVITY Link */}
                      {(notif.type === "ASSIGNMENT_SUBMITTED" || notif.type === "ASSIGNMENT_DOUBT_REPLY" || notif.type === "ASSIGNMENT_DOUBT") && !isAccepted && (
                        <div className="mt-3 flex">
                          <button
                            onClick={() => {
                              if (isTeacher) {
                                navigate(`/teacher/community/publish-assignment/${notif.classroomId}`, {
                                  state: {
                                    openAssignmentId: notif.relatedId
                                  }
                                });
                              } else {
                                navigate(chatPath, {
                                  state: {
                                    openAssignmentId: notif.relatedId,
                                    initialTab: "doubts",
                                    timestamp: Date.now()
                                  }
                                });
                              }
                            }}
                            className={`inline-flex items-center gap-1 text-xs font-bold ${palette.link} hover:underline decoration-2 underline-offset-2`}
                          >
                            View Details <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                          </button>
                        </div>
                      )}

                      {/* ASSIGNMENT PUBLISHED Link */}
                      {notif.type === "ASSIGNMENT_PUBLISHED" && !isAccepted && (
                        <div className="mt-3 flex">
                          <button
                            onClick={() => {
                              // Let the community page pick up openAssignmentId from state
                              navigate(chatPath, {
                                state: { openAssignmentId: notif.relatedId, initialTab: "details", timestamp: Date.now() }
                              });
                            }}
                            className={`inline-flex items-center gap-1 text-xs font-bold ${palette.link} hover:underline decoration-2 underline-offset-2`}
                          >
                            View Details <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                          </button>
                        </div>
                      )}

                      {/* Generic Link if provided (and not handled by buttons) */}
                      {notif.link && !isFriendRequest && !isAccepted && notif.type !== "ASSIGNMENT_DOUBT_REPLY" && notif.type !== "ASSIGNMENT_DOUBT" && notif.type !== "ASSIGNMENT_PUBLISHED" && (
                        <div className="mt-3 flex">
                          <Link
                            to={notif.link}
                            className={`inline-flex items-center gap-1 text-xs font-bold ${palette.link} hover:underline decoration-2 underline-offset-2`}
                          >
                            View Details <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                          </Link>
                        </div>
                      )}

                      {/* Expand/Collapse Toggle for Grouped Notifications */}
                      {notif.isGrouped && notif.subNotifications?.length > 1 && (
                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleGroupExpand(notif.relatedId); }}
                            className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
                          >
                            {expandedGroups[notif.relatedId] ? 'Hide' : 'Show'} {notif.subNotifications.length} Notifications
                            <svg
                              className={`w-3 h-3 transition-transform ${expandedGroups[notif.relatedId] ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                          </button>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Sub-notifications List */}
                  {
                    notif.isGrouped && expandedGroups[notif.relatedId] && (
                      <div className="ml-4 min-[426px]:ml-8 mr-1 min-[426px]:mr-2 mt-[-8px] mb-4 space-y-2 border-l-2 border-gray-100 pl-3 min-[426px]:pl-4 py-2">
                        {notif.subNotifications.map((sub, sIdx) => (
                          <div key={sub.id || sub._id || sIdx} className="bg-gray-50/50 rounded-lg p-3 flex gap-3 text-sm border border-gray-100 items-start">
                            <div className="mt-0.5 text-gray-400">
                              {sub.type === "ASSIGNMENT_SUBMITTED" ? (
                                <svg className={`w-4 h-4 ${getSubNotifPalette(sub.type).icon} fill-current`} viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M14,6.5c0,.829-.672,1.5-1.5,1.5H6.5c-.829,0-1.5-.671-1.5-1.5s.671-1.5,1.5-1.5h6c.828,0,1.5,.671,1.5,1.5Zm-6.5,14.5h-2c-1.378,0-2.5-1.122-2.5-2.5V5.5c0-1.378,1.122-2.5,2.5-2.5H13.5c1.379,0,2.5,1.122,2.5,2.5V14.5c0,.829,.672,1.5,1.5,1.5s1.5-.671,1.5-1.5V5.5c0-3.033-2.468-5.5-5.5-5.5H5.5C2.467,0,0,2.467,0,5.5v13c0,3.033,2.467,5.5,5.5,5.5h2c.829,0,1.5-.671,1.5-1.5s-.671-1.5-1.5-1.5Zm0-6h-1c-.829,0-1.5,.671-1.5,1.5s.671,1.5,1.5,1.5h1c.829,0,1.5-.671,1.5-1.5s-.671-1.5-1.5-1.5Zm16.043,.422c-.594-.576-1.543-.561-2.121,.034l-5.102,5.271c-.354,.369-.996,.36-1.338-.02l-2.391-2.535c-.567-.602-1.517-.63-2.121-.062-.603,.568-.63,1.518-.062,2.121l2.391,2.535c1.461,1.607,4.148,1.644,5.66,.065l5.119-5.288c.576-.595,.561-1.545-.035-2.121Zm-11.043-5.422H6.5c-.829,0-1.5,.671-1.5,1.5s.671,1.5,1.5,1.5h6c.828,0,1.5-.671,1.5-1.5s-.672-1.5-1.5-1.5Z" />
                                </svg>
                              ) : (
                                <svg className={`w-4 h-4 ${getSubNotifPalette(sub.type).icon} fill-current`} viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M6,14c2.206,0,4-1.794,4-4s-1.794-4-4-4-4,1.794-4,4,1.794,4,4,4Zm0-6c1.103,0,2,.897,2,2s-.897,2-2,2-2-.897-2-2,.897-2,2-2Zm6,14v1c0,.552-.448,1-1,1s-1-.448-1-1v-1c0-2.206-1.794-4-4-4s-4,1.794-4,4v1c0,.552-.448,1-1,1s-1-.448-1-1v-1c0-3.309,2.691-6,6-6s6,2.691,6,6ZM20.999,0h-6c-1.65,.002-2.999,1.352-2.999,3.002l.002,8.772c0,.638,.524,1.088,1.089,1.088,.196,0,.397-.054,.583-.173l2.454-1.69h4.872c1.657,0,3-1.343,3-3V3C24,1.343,22.656,0,20.999,0Zm-2.999,10c-.552,0-1-.448-1-1s.448-1,1-1,1,.448,1,1-.448,1-1,1Zm1.502-3.402c-.507,.27-1.124,.373-1.503,.402-.491,0-.919-.362-.989-.862-.076-.547,.305-1.052,.852-1.128,.244-.034,.561-.108,.653-.151,.293-.171,.485-.503,.485-.859,0-.551-.449-1-1-1s-1,.449-1,1-.448,1-1,1-1-.448-1-1c0-1.654,1.346-3,3-3s3,1.346,3,3c0,1.067-.574,2.062-1.498,2.598Z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-0.5">
                                <span className={`font-semibold text-xs ${!sub.read ? 'text-gray-900' : 'text-gray-600'}`}>
                                  {sub.content?.split(" ")[0] || "Someone"}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(sub.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{sub.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </React.Fragment>
              );
            })
          )}

        </div>
      </div>
    </div >
  );
}
