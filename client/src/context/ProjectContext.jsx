import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "./AuthContext";
import socket from "../services/socket.service";
import axios from "axios";
import { server } from "../main";
import { auth } from "../firebase/firebase";

const ProjectContext = createContext();
const GROUP_PAGE_SIZE = 30;

export function ProjectProvider({ children }) {
  const { user } = useAuth();
  const [groupMessages, setGroupMessages] = useState({});
  const [groupPages, setGroupPages] = useState({});
  const [groupDetails, setGroupDetails] = useState({});

  const fetchGroupMessages = useCallback(async (channelId, opts = {}) => {
    if (!user || !channelId) return;

    const options = typeof opts === "boolean" ? { force: opts } : opts;
    const { force = false, append = false, before = null, limit = GROUP_PAGE_SIZE } = options;

    if (!append && !force && groupMessages[channelId]) return;
    if (append && !before && !groupPages[channelId]?.nextBefore) return;

    try {
      const token = await auth.currentUser.getIdToken();
      const { data } = await axios.get(`${server}/chat/messages/${channelId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit, before: before || groupPages[channelId]?.nextBefore || undefined },
      });

      const rawMessages = Array.isArray(data) ? data : data.messages || [];
      const pageInfo = Array.isArray(data)
        ? { hasMore: false, nextBefore: null }
        : data.pageInfo || { hasMore: false, nextBefore: null };

      const myUid = auth.currentUser?.uid;
      const processed = rawMessages.map((msg) => ({
        ...msg,
        isMe: msg.sender?.firebaseUid === myUid,
        text: msg.isDeleted ? "This message was deleted" : msg.text,
      }));

      setGroupMessages((prev) => {
        const current = prev[channelId] || [];
        const nextList = append ? [...processed, ...current] : processed;
        const deduped = nextList.filter(
          (item, idx, arr) => arr.findIndex((x) => String(x._id) === String(item._id)) === idx
        );
        return { ...prev, [channelId]: deduped };
      });

      setGroupPages((prev) => ({
        ...prev,
        [channelId]: {
          hasMore: Boolean(pageInfo.hasMore),
          nextBefore: pageInfo.nextBefore || null,
          loadingOlder: false,
        },
      }));

      return { hasMore: Boolean(pageInfo.hasMore), loadedCount: processed.length };
    } catch (err) {
      console.error("ProjectContext: Fetch failed", err);
      setGroupPages((prev) => ({
        ...prev,
        [channelId]: {
          ...(prev[channelId] || {}),
          loadingOlder: false,
        },
      }));
      return { hasMore: false, loadedCount: 0 };
    }
  }, [user, groupMessages, groupPages]);

  const loadOlderGroupMessages = useCallback(async (channelId, limit = GROUP_PAGE_SIZE) => {
    if (!channelId) return false;
    const page = groupPages[channelId];
    if (!page?.hasMore || page?.loadingOlder) return false;

    setGroupPages((prev) => ({
      ...prev,
      [channelId]: { ...(prev[channelId] || {}), loadingOlder: true },
    }));

    const res = await fetchGroupMessages(channelId, {
      append: true,
      before: page.nextBefore,
      limit,
    });

    return Number(res?.loadedCount || 0);
  }, [groupPages, fetchGroupMessages]);

  useEffect(() => {
    if (!user) return;

    const handleReceive = (msg) => {
      const chId = msg.channelId || msg.channel || msg.room;
      if (!chId) return;

      setGroupMessages((prev) => {
        const current = prev[chId] || [];

        if (msg._id && current.find((m) => m._id === msg._id)) return prev;

        if (msg.customId) {
          const existingOptimistic = current.find((m) => m.customId === msg.customId);
          if (existingOptimistic) {
            const myUid = auth.currentUser?.uid;
            const isMe = msg.sender?.firebaseUid === myUid || msg.firebaseUid === myUid;
            return {
              ...prev,
              [chId]: current.map((m) => (m.customId === msg.customId ? { ...msg, isMe } : m)),
            };
          }
        }

        const myUid = auth.currentUser?.uid;
        const isMe = msg.sender?.firebaseUid === myUid || msg.firebaseUid === myUid;

        return {
          ...prev,
          [chId]: [...current, { ...msg, isMe }],
        };
      });
    };

    const handleUpdate = ({ channelId, description, deadline }) => {
      setGroupDetails((prev) => ({
        ...prev,
        [channelId]: { ...prev[channelId], description, deadline },
      }));
    };

    const handleDelete = ({ messageId, type, channelId }) => {
      setGroupMessages((prev) => {
        const current = prev[channelId] || [];
        if (type === "everyone") {
          return {
            ...prev,
            [channelId]: current.map((m) =>
              String(m._id) === String(messageId)
                ? { ...m, isDeleted: true, text: "This message was deleted" }
                : m
            ),
          };
        } else if (type === "me") {
          return {
            ...prev,
            [channelId]: current.filter((m) => String(m._id) !== String(messageId)),
          };
        }
        return prev;
      });
    };

    socket.on("receive_message", handleReceive);
    socket.on("group_updated", handleUpdate);
    socket.on("message_deleted", handleDelete);

    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("group_updated", handleUpdate);
      socket.off("message_deleted", handleDelete);
    };
  }, [user]);

  const value = useMemo(() => ({
    groupMessages,
    groupPages,
    groupDetails,
    fetchGroupMessages,
    loadOlderGroupMessages,
    setGroupDetails,
    setGroupMessages,
  }), [groupMessages, groupPages, groupDetails, fetchGroupMessages, loadOlderGroupMessages]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export const useProject = () => useContext(ProjectContext);
