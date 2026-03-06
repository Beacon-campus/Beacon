import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import socket from "../services/socket.service";
import axios from "axios";
import { server } from "../main";
import { auth } from "../firebase/firebase";

const CommunityContext = createContext();
const COMMUNITY_PAGE_SIZE = 30;

export function useCommunity() {
  return useContext(CommunityContext);
}

export function CommunityProvider({ children }) {
  const { user } = useAuth();

  const [announcements, setAnnouncements] = useState({});
  const [announcementPages, setAnnouncementPages] = useState({});
  const [hubMessages, setHubMessages] = useState({});
  const [hubPages, setHubPages] = useState({});
  const [doubts, setDoubts] = useState({});
  const [classroomDetails, setClassroomDetails] = useState({}); 
  const [hasSynced, setHasSynced] = useState(false);

  const syncClassrooms = useCallback(async () => {
    if (hasSynced || !user) return;
    try {
      const token = await auth.currentUser.getIdToken();
      await axios.post(`${server}/chat/sync-classrooms`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setHasSynced(true);
    } catch (err) {
      console.error("CommunityContext: Sync failed", err);
    }
  }, [user, hasSynced]);

  const fetchAnnouncements = useCallback(async (channelId, opts = {}) => {
    if (!user || !channelId) return;

    const options = typeof opts === "boolean" ? { force: opts } : opts;
    const {
      force = false,
      append = false,
      before = null,
      limit = COMMUNITY_PAGE_SIZE,
    } = options;

    if (!append && !force && announcements[channelId]) return;
    if (append && !before && !announcementPages[channelId]?.nextBefore) return;

    try {
      const token = await auth.currentUser.getIdToken();
      const { data } = await axios.get(
        `${server}/classroom/announcements/${channelId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit, before: before || announcementPages[channelId]?.nextBefore || undefined },
        }
      );

      const pagePosts = Array.isArray(data) ? data : data.posts || [];
      const pageInfo = Array.isArray(data)
        ? { hasMore: false, nextBefore: null }
        : data.pageInfo || { hasMore: false, nextBefore: null };

      setAnnouncements(prev => {
        const current = prev[channelId] || [];
        const nextList = append ? [...pagePosts, ...current] : pagePosts;
        const deduped = nextList.filter(
          (item, idx, arr) => arr.findIndex((x) => String(x._id) === String(item._id)) === idx
        );
        return { ...prev, [channelId]: deduped };
      });

      setAnnouncementPages(prev => ({
        ...prev,
        [channelId]: {
          hasMore: Boolean(pageInfo.hasMore),
          nextBefore: pageInfo.nextBefore || null,
          loadingOlder: false,
        },
      }));

      return { hasMore: Boolean(pageInfo.hasMore), loadedCount: pagePosts.length };
    } catch (error) {
      console.error("CommunityContext: Error fetching announcements", error);
      setAnnouncementPages(prev => ({
        ...prev,
        [channelId]: {
          ...(prev[channelId] || {}),
          loadingOlder: false,
        },
      }));
      return { hasMore: false, loadedCount: 0 };
    }
  }, [user, announcements, announcementPages]);

  const fetchHubMessages = useCallback(async (channelId, opts = {}) => {
      if (!user || !channelId) return;

      const options = typeof opts === "boolean" ? { force: opts } : opts;
      const {
        force = false,
        append = false,
        before = null,
        limit = COMMUNITY_PAGE_SIZE,
      } = options;

      if (!append && !force && hubMessages[channelId]) return;
      if (append && !before && !hubPages[channelId]?.nextBefore) return;

      try {
        const token = await auth.currentUser.getIdToken();
        const { data } = await axios.get(
          `${server}/chat/messages/${channelId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit, before: before || hubPages[channelId]?.nextBefore || undefined },
          }
        );

        const rawMessages = Array.isArray(data) ? data : data.messages || [];
        const pageInfo = Array.isArray(data)
          ? { hasMore: false, nextBefore: null }
          : data.pageInfo || { hasMore: false, nextBefore: null };

        const currentUserId = user?._id; 
        const filteredData = rawMessages.filter(msg => {
             if (!msg.deletedFor) return true;
             return !msg.deletedFor.includes(currentUserId);
        });

        const processed = filteredData.map(msg => ({
            ...msg,
            isMe: msg.sender?.firebaseUid === auth.currentUser?.uid,
            text: msg.isDeleted ? "🚫 This message was deleted" : msg.text
        }));

        setHubMessages(prev => {
          const current = prev[channelId] || [];
          const nextList = append ? [...processed, ...current] : processed;
          const deduped = nextList.filter(
            (item, idx, arr) => arr.findIndex((x) => String(x._id) === String(item._id)) === idx
          );
          return { ...prev, [channelId]: deduped };
        });

        setHubPages(prev => ({
          ...prev,
          [channelId]: {
            hasMore: Boolean(pageInfo.hasMore),
            nextBefore: pageInfo.nextBefore || null,
            loadingOlder: false,
          },
        }));

        return { hasMore: Boolean(pageInfo.hasMore), loadedCount: processed.length };
      } catch (error) {
        console.error("CommunityContext: Error fetching hub messages", error);
        setHubPages(prev => ({
          ...prev,
          [channelId]: {
            ...(prev[channelId] || {}),
            loadingOlder: false,
          },
        }));
        return { hasMore: false, loadedCount: 0 };
      }
  }, [user, hubMessages, hubPages]);

  const loadOlderAnnouncements = useCallback(async (channelId, limit = COMMUNITY_PAGE_SIZE) => {
    if (!channelId) return false;
    const page = announcementPages[channelId];
    if (!page?.hasMore || page?.loadingOlder) return false;

    setAnnouncementPages(prev => ({
      ...prev,
      [channelId]: { ...(prev[channelId] || {}), loadingOlder: true },
    }));

    const res = await fetchAnnouncements(channelId, {
      append: true,
      before: page.nextBefore,
      limit,
    });
    return Number(res?.loadedCount || 0);
  }, [announcementPages, fetchAnnouncements]);

  const loadOlderHubMessages = useCallback(async (channelId, limit = COMMUNITY_PAGE_SIZE) => {
    if (!channelId) return false;
    const page = hubPages[channelId];
    if (!page?.hasMore || page?.loadingOlder) return false;

    setHubPages(prev => ({
      ...prev,
      [channelId]: { ...(prev[channelId] || {}), loadingOlder: true },
    }));

    const res = await fetchHubMessages(channelId, {
      append: true,
      before: page.nextBefore,
      limit,
    });
    return Number(res?.loadedCount || 0);
  }, [hubPages, fetchHubMessages]);

  const fetchDetails = useCallback(async (id) => {
    if (classroomDetails[id]) return classroomDetails[id];
    try {
      const token = await auth.currentUser.getIdToken();
      const { data } = await axios.get(`${server}/classroom/details/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClassroomDetails(prev => ({ ...prev, [id]: data }));
      return data;
    } catch (err) { console.error(err); return null; }
  }, [classroomDetails]);

  const fetchDoubts = useCallback(async (announcementId, force = false) => {
      if (!user || !announcementId) return;
      if (!force && doubts[announcementId]) return;

      try {
        const token = await auth.currentUser.getIdToken();
        const { data } = await axios.get(
          `${server}/classroom/comments/${announcementId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDoubts(prev => ({ ...prev, [announcementId]: data }));
      } catch (error) {
          console.error("CommunityContext: Error fetching doubts", error);
      }
  }, [user, doubts]);

  useEffect(() => {
      if (!user) return;

      const handleNewAnnouncement = (post) => {
          setAnnouncements(prev => {
              const channelId = post.classroomId;
              if (!prev[channelId]) return prev;
              const currentList = prev[channelId];
              if (currentList.find(p => p._id === post._id)) return prev;
              return { ...prev, [channelId]: [...currentList, post] };
          });
      };
      
      const handleReceiveMessage = (msg) => {
          setHubMessages(prev => {
              const channelId = msg.channelId;
              if (!prev[channelId]) return prev;
              const currentList = prev[channelId];
              if (currentList.find(m => m._id === msg._id)) return prev;
              const isMe = msg.sender?.firebaseUid === auth.currentUser?.uid;
              const processedMsg = { ...msg, isMe };

              if (msg.customId) {
                  const existingOptimistic = currentList.find(m => m.customId === msg.customId);
                  if (existingOptimistic) {
                       return { ...prev, [channelId]: currentList.map(m => m.customId === msg.customId ? processedMsg : m) };
                  }
              }
              return { ...prev, [channelId]: [...currentList, processedMsg] };
          });
      };
      
      const handleMessageDeleted = ({ messageId, type, channelId }) => {
          setHubMessages(prev => {
               if (!prev[channelId]) return prev;
               return {
                   ...prev,
                   [channelId]: prev[channelId].map(msg => {
                       if (msg._id === messageId && type === 'everyone') {
                           return { ...msg, isDeleted: true, text: "🚫 This message was deleted" };
                       }
                       return msg;
                   })
               };
          });
      };

      socket.on("new_announcement", handleNewAnnouncement);
      socket.on("receive_message", handleReceiveMessage); 
      socket.on("message_deleted", handleMessageDeleted);

      return () => {
          socket.off("receive_message", handleReceiveMessage);
          socket.off("message_deleted", handleMessageDeleted);
          socket.off("new_announcement", handleNewAnnouncement);
      };
  }, [user]);

  useEffect(() => {
      if (!user) {
          setAnnouncements({});
          setAnnouncementPages({});
          setHubMessages({});
          setHubPages({});
          setDoubts({});
          setClassroomDetails({});
          setHasSynced(false);
      }
  }, [user]);

  const addAnnouncement = useCallback((channelId, post) => {
      setAnnouncements(prev => ({
          ...prev,
          [channelId]: [...(prev[channelId] || []), post]
      }));
  }, []);

  const addHubMessage = useCallback((channelId, msg) => {
       setHubMessages(prev => ({
           ...prev,
           [channelId]: [...(prev[channelId] || []), msg]
       }));
  }, []);
  
  const deleteHubMessageForMe = useCallback((channelId, messageId) => {
      setHubMessages(prev => {
          if (!prev[channelId]) return prev;
          return { ...prev, [channelId]: prev[channelId].filter(m => m._id !== messageId) };
      });
  }, []);

  // --- OPTIMIZATION: Memoize Context Value ---
  const value = useMemo(() => ({
      announcements,
      announcementPages,
      hubMessages,
      hubPages,
      doubts,
      classroomDetails,
      fetchAnnouncements,
      fetchHubMessages,
      loadOlderAnnouncements,
      loadOlderHubMessages,
      fetchDoubts,
      fetchDetails,
      syncClassrooms,
      hasSynced,
      addAnnouncement,
      addHubMessage,
      deleteHubMessageForMe
  }), [
      announcements, announcementPages, hubMessages, hubPages, doubts, classroomDetails, hasSynced,
      fetchAnnouncements, fetchHubMessages, loadOlderAnnouncements, loadOlderHubMessages, fetchDoubts, fetchDetails, syncClassrooms, addAnnouncement, addHubMessage, deleteHubMessageForMe
  ]);

  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  );
}
