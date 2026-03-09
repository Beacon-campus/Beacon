import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiClient from "../services/apiClient";
import { auth } from "../firebase/firebase";
import { clearPageCacheByPrefix, getOrFetchPageCache } from "../services/pageCache.service";

// Standard Icons
const BellIcon = () => <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>;
const CheckAllIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>;

import socket from "../services/socket.service";



export default function Notifications() {
  const { user: currentUserInfo, refreshUser } = useAuth();
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

  useEffect(() => {
    fetchNotifications();
    fetchPendingFriendRequests();
  }, []);

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
        refreshUser().finally(() => {
          fetchNotifications();
          fetchPendingFriendRequests();
        });
      }
    };

    const handleNewNotification = (notif) => {
      fetchNotifications();
      if (!notif?.type) return;
      // Friend request toasts are handled by socket manager; this is for persisted notifications.
      if (notif.type.startsWith("FRIEND_")) return;
      const message = notif.title || notif.content || "New notification";
      toast(message, { icon: "🔔" });
    };

    socket.on("event", handleEvent);
    socket.on("new_notification", handleNewNotification);
    return () => {
      socket.off("event", handleEvent);
      socket.off("new_notification", handleNewNotification);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getOrFetchPageCache(
        "notifications:list",
        userCacheKey,
        async () => (await apiClient.get("/notifications")).data || [],
        { ttlMs: 60_000 }
      );
      // Friend request records are derived from friendRequests, not notification history.
      const nonFriendNotifications = (data || []).filter(
        (n) => !["FRIEND_REQUEST", "FRIEND_REQUEST_RECEIVED"].includes(n.type)
      );
      setNotifications(nonFriendNotifications);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingFriendRequests = async () => {
    try {
      if (!auth.currentUser || currentUserInfo?.role !== "student") {
        setPendingFriendUsers([]);
        return;
      }

      const received = currentUserInfo?.friendRequests?.received || [];
      if (!received.length) {
        setPendingFriendUsers([]);
        return;
      }

      const data = await getOrFetchPageCache(
        `notifications:friend-requests:${received.join(",")}`,
        userCacheKey,
        async () => (await apiClient.post("/friends/get-users", { userIds: received })).data || [],
        { ttlMs: 60_000 }
      );

      const byId = new Map((data || []).map((u) => [u._id?.toString(), u]));
      const ordered = received
        .map((id) => byId.get(id.toString()))
        .filter(Boolean);

      setPendingFriendUsers(ordered);
    } catch (error) {
      console.error("Failed to fetch pending friend requests", error);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      await apiClient.delete("/notifications/all");
      clearPageCacheByPrefix("notifications:", userCacheKey);

      setNotifications([]);
      toast.success("All notifications deleted");
    } catch {
      toast.error("Failed to delete all");
    }
  };

  const openDmWithUser = async (targetId) => {
    const { data } = await apiClient.post("/chat/create-by-id", { targetId });
    navigate(chatPath, { state: { activeChatId: data._id, timestamp: Date.now() } });
  };

  const handleAcceptRequest = async (requesterId, openChatAfter = false) => {
    try {
      await apiClient.post("/friends/accept", { requesterId });
      clearPageCacheByPrefix("notifications:", userCacheKey);
      toast.success("Friend request accepted!");
      await refreshUser();
      await fetchPendingFriendRequests();
      await fetchNotifications();
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
      clearPageCacheByPrefix("notifications:", userCacheKey);
      toast.success("Request removed");
      await refreshUser();
      await fetchPendingFriendRequests();
      await fetchNotifications();
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
    <div className="h-full w-full p-2">
      <div className="h-full w-full premium-card p-6 flex flex-col gap-6 overflow-hidden">

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
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

          <div className="flex items-center gap-4">
            {/* ================= ICON-ONLY PILL FILTERS ================= */}
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

            <button
              onClick={deleteAllNotifications}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-100 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              Delete all
            </button>
          </div>
        </div>

        {/* ================= NOTIFICATION LIST ================= */}
        <div className="flex-1 overflow-y-auto pr-2 soft-scrollbar space-y-3">

          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mb-2"></div>
              <p>Loading...</p>
            </div>
          ) : finalNotifications.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-gray-400">
              <p>No notifications found</p>
            </div>
          ) : (
            finalNotifications.map((notif, idx) => {
              const isFriendRequest = notif.type === "FRIEND_REQUEST" || notif.type === "FRIEND_REQUEST_RECEIVED";
              const isFriendRequestGroup = notif.type === "FRIEND_REQUEST_GROUP";

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
                    className={`group relative border-b border-gray-100 p-4 pl-6 flex items-start gap-4 transition-all duration-200 ${!isFriendRequestGroup && (!isFriendRequest || isAccepted) ? "cursor-pointer" : ""}
                            ${(!notif.read && !isAccepted) || notif.unread
                        ? "bg-blue-50/40 hover:bg-blue-50/60"
                        : "bg-transparent hover:bg-gray-50"
                      }`}
                  >
                    {/* Unread Indicator Bar */}
                    {((!notif.read && !isAccepted) || notif.unread) && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    )}

                    {/* Icon Container */}
                    <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center
                              ${(!notif.read && !isAccepted) || notif.unread ? "bg-white shadow-sm" : "bg-gray-100"}
                          `}>
                      {isFriendRequest ? (
                        <svg className="w-6 h-6 text-blue-500" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                      ) : (
                        <svg className={`w-6 h-6 ${(!notif.read && !isAccepted) || notif.unread ? 'text-blue-500' : 'text-gray-500'}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-sm font-bold truncate ${(!notif.read && !isAccepted) || notif.unread ? "text-gray-900" : "text-gray-700"}`}>
                          {isAccepted ? "Friend Request Accepted" : (notif.isGrouped ? `${notif.activityCount} New Activities` : (notif.title || (isFriendRequest ? "Friend Request" : "Notification")))}
                        </h3>
                        <span className="text-xs text-gray-400 font-medium whitespace-nowrap ml-2">
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
                            <div key={reqUser._id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{reqUser.profile?.name || "User"}</p>
                                <p className="text-xs text-gray-500 truncate">{reqUser.profile?.regno || ""}</p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={() => handleAcceptRequest(reqUser._id)}
                                  className="text-xs font-bold bg-[#0F172A] text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleAcceptRequest(reqUser._id, true)}
                                  className="text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                                  Accept + Chat
                                </button>
                                <button
                                  onClick={() => handleDeclineRequest(reqUser._id)}
                                  className="text-xs font-bold text-gray-500 hover:text-gray-700 px-2 py-1.5">
                                  Decline
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
                            className="text-xs font-bold bg-[#0F172A] text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                            Accept
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeclineRequest(notif.relatedId); }}
                            className="text-xs font-bold text-gray-500 hover:text-gray-700 px-2 py-2">
                            Decline
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
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline decoration-2 underline-offset-2"
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
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline decoration-2 underline-offset-2"
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
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline decoration-2 underline-offset-2"
                          >
                            View Details <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                          </Link>
                        </div>
                      )}

                      {/* Expand/Collapse Toggle for Grouped Notifications */}
                      {notif.isGrouped && notif.subNotifications?.length > 1 && (
                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
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
                      <div className="ml-8 mr-2 mt-[-8px] mb-4 space-y-2 border-l-2 border-gray-100 pl-4 py-2">
                        {notif.subNotifications.map((sub, sIdx) => (
                          <div key={sub.id || sub._id || sIdx} className="bg-gray-50/50 rounded-lg p-3 flex gap-3 text-sm border border-gray-100 items-start">
                            <div className="mt-0.5 text-gray-400">
                              {sub.type === "ASSIGNMENT_SUBMITTED" ? (
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              ) : (
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
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
