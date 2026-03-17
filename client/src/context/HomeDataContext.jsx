import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import apiClient from "../services/apiClient";
import {
  fetchTodos as fetchTodosApi,
  createTodo,
  updateTodoApi,
  deleteTodoApi,
} from "../services/todo.service";
import {
  fetchNotes as fetchNotesApi,
  createNote,
  updateNoteApi,
  deleteNoteApi,
} from "../services/note.service";
import { fetchRecentUniversityAnnouncements } from "../services/university.service";
import {
  getOrFetchPageCache,
  setPageCache,
} from "../services/pageCache.service";

const HomeDataContext = createContext(null);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeNotificationType = (rawType = "") => {
  const type = String(rawType || "").toUpperCase();
  if (type.includes("URGENT")) return "urgent";
  if (type.includes("FRIEND")) return "friend_req";
  if (type.includes("UNIVERSITY") || type.includes("ANNOUNCEMENT")) return "university";
  if (type.includes("DOUBT")) return "alert";
  if (type.includes("ASSIGNMENT")) return "assignment";
  return "info";
};

export function HomeDataProvider({ children }) {
  const { user } = useAuth();
  const userCacheKey = user?.uid || "guest";
  const [todos, setTodos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [calendarCurrent, setCalendarCurrent] = useState(null);
  const [universityAnnouncements, setUniversityAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationsAll, setNotificationsAll] = useState([]);

  const [todoLoading, setTodoLoading] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [homeLoading, setHomeLoading] = useState(false);
  const todosRef = useRef([]);
  const todosLoadingRef = useRef(false);
  const notesLoadingRef = useRef(false);
  const announcementsLoadingRef = useRef(false);
  const notificationsLoadingRef = useRef(false);
  const calendarLoadingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (user) return;
    setTodos([]);
    setNotes([]);
    setCalendarCurrent(null);
    setUniversityAnnouncements([]);
    setNotifications([]);
    setNotificationsAll([]);
    hasFetchedRef.current = false;
    todosLoadingRef.current = false;
    notesLoadingRef.current = false;
    announcementsLoadingRef.current = false;
    notificationsLoadingRef.current = false;
    calendarLoadingRef.current = false;
  }, [user]);

  useEffect(() => {
    todosRef.current = todos;
  }, [todos]);

  const fetchTodos = useCallback(
    async (force = false) => {
      if (!user) return [];
      if (!force && todosRef.current.length > 0) return todosRef.current;
      if (todosLoadingRef.current) return todosRef.current;

      setTodoLoading(true);
      todosLoadingRef.current = true;
      try {
        const data = await getOrFetchPageCache(
          "home:todos",
          userCacheKey,
          fetchTodosApi,
          { force, ttlMs: 60_000 }
        );
        const mapped = (data || []).map((t) => ({ ...t, id: t._id }));
        setTodos(mapped);
        return mapped;
      } finally {
        setTodoLoading(false);
        todosLoadingRef.current = false;
      }
    },
    [user, userCacheKey]
  );

  const fetchNotes = useCallback(
    async (force = false) => {
      if (!user) return [];
      if (!force && notes.length > 0) return notes;
      if (notesLoadingRef.current) return notes;

      setNoteLoading(true);
      notesLoadingRef.current = true;
      try {
        const data = await getOrFetchPageCache(
          "home:notes",
          userCacheKey,
          fetchNotesApi,
          { force, ttlMs: 60_000 }
        );
        const mapped = (data || []).map((n) => ({ ...n, id: n._id }));
        setNotes(mapped);
        return mapped;
      } finally {
        setNoteLoading(false);
        notesLoadingRef.current = false;
      }
    },
    [user, notes, userCacheKey]
  );

  const fetchUniversityAnnouncements = useCallback(
    async (force = false, limit = 8) => {
      if (!user) return [];
      if (!force && universityAnnouncements.length > 0) return universityAnnouncements;
      if (announcementsLoadingRef.current) return universityAnnouncements;

      announcementsLoadingRef.current = true;
      const data = await fetchRecentUniversityAnnouncements(limit, { force });
      const normalized = (data || []).map((item) => ({
        ...item,
        text: item.message,
        sender: item.createdBy?.name || "Admin",
      }));
      setUniversityAnnouncements(normalized);
      announcementsLoadingRef.current = false;
      return normalized;
    },
    [user, universityAnnouncements, userCacheKey]
  );

  const buildNotificationSummary = useCallback(
    (items, limit = 8) =>
      (items || [])
        .sort(
          (a, b) =>
            new Date(b.timestamp || b.createdAt || 0) -
            new Date(a.timestamp || a.createdAt || 0)
        )
        .slice(0, limit)
        .map((n) => ({
          id: n._id || n.id,
          title: n.title || "Notification",
          desc: n.content || n.description || "",
          type: normalizeNotificationType(n.type),
          rawType: n.type || "",
        })),
    []
  );

  const fetchNotifications = useCallback(
    async (force = false, limit = 8) => {
      if (!user) return [];
      if (!force && notifications.length > 0) return notifications;
      if (notificationsLoadingRef.current) return notifications;

      notificationsLoadingRef.current = true;
      const data = await getOrFetchPageCache(
        "notifications:list",
        userCacheKey,
        async () => {
          const response = await apiClient.get("/notifications");
          return response.data || [];
        },
        { force, ttlMs: 60_000 }
      );
      const list = Array.isArray(data) ? data : [];
      setNotificationsAll(list);
      const latest = buildNotificationSummary(list, limit);
      setNotifications(latest);
      notificationsLoadingRef.current = false;
      return latest;
    },
    [user, notifications, userCacheKey, buildNotificationSummary]
  );

  const fetchNotificationsAll = useCallback(
    async (force = false, limit = 8) => {
      if (!user) return [];
      if (notificationsLoadingRef.current) return notificationsAll;

      notificationsLoadingRef.current = true;
      const data = await getOrFetchPageCache(
        "notifications:list",
        userCacheKey,
        async () => {
          const response = await apiClient.get("/notifications");
          return response.data || [];
        },
        { force, ttlMs: 60_000 }
      );
      const list = Array.isArray(data) ? data : [];
      setNotificationsAll(list);
      if (limit != null) {
        setNotifications(buildNotificationSummary(list, limit));
      }
      notificationsLoadingRef.current = false;
      return list;
    },
    [user, userCacheKey, buildNotificationSummary, notificationsAll]
  );

  const fetchCalendarCurrent = useCallback(
    async (force = false) => {
      if (!user) return null;
      if (calendarLoadingRef.current) return calendarCurrent;
      calendarLoadingRef.current = true;
      const data = await getOrFetchPageCache(
        "home:calendar-current",
        userCacheKey,
        async () => (await apiClient.get("/calendar/current")).data,
        { force, ttlMs: 60_000 }
      );
      setCalendarCurrent(data);
      calendarLoadingRef.current = false;
      return data;
    },
    [user, userCacheKey, calendarCurrent]
  );

  const fetchAllHomeData = useCallback(
    async (force = false) => {
      if (!user) return;
      if (homeLoading) return;
      setHomeLoading(true);
      try {
        if (force || todos.length === 0) {
          await fetchTodos(force);
          await wait(250);
        }
        if (force || notes.length === 0) {
          await fetchNotes(force);
          await wait(250);
        }
        if (force || !calendarCurrent) {
          await fetchCalendarCurrent(force);
          await wait(250);
        }
        if (force || universityAnnouncements.length === 0) {
          await fetchUniversityAnnouncements(force, 8);
          await wait(250);
        }
        if (force || notifications.length === 0) {
          await fetchNotifications(force, 8);
        }
      } catch (error) {
        console.error("HomeDataContext fetchAllHomeData failed:", error);
      } finally {
        setHomeLoading(false);
      }
    },
    [
      user,
      todos.length,
      notes.length,
      calendarCurrent,
      universityAnnouncements.length,
      notifications.length,
      fetchTodos,
      fetchNotes,
      fetchCalendarCurrent,
      fetchUniversityAnnouncements,
      fetchNotifications,
      homeLoading,
    ]
  );

  useEffect(() => {
    if (!user) return;
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchAllHomeData().catch(() => {});
  }, [user, fetchAllHomeData]);

  const addTodo = useCallback(async (todoData) => {
    const newTodo = await createTodo(todoData);
    const mapped = { ...newTodo, id: newTodo._id };
    setTodos((prev) => {
      const next = [mapped, ...prev];
      setPageCache("home:todos", userCacheKey, next, 60_000);
      return next;
    });
    return mapped;
  }, [userCacheKey]);

  const updateTodo = useCallback(async (id, updates) => {
    const updated = await updateTodoApi(id, updates);
    setTodos((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...updated, id: updated._id } : t));
      setPageCache("home:todos", userCacheKey, next, 60_000);
      return next;
    });
    return updated;
  }, [userCacheKey]);

  const toggleTodoComplete = useCallback(
    async (id, currentStatus) => {
      const previous = [...todos];
      const optimistic = previous.map((t) =>
        t.id === id ? { ...t, completed: currentStatus } : t
      );
      setTodos(optimistic);
      setPageCache("home:todos", userCacheKey, optimistic, 60_000);
      try {
        const updated = await updateTodoApi(id, { completed: currentStatus });
        const merged = optimistic.map((t) =>
          t.id === id ? { ...t, ...updated, id: updated._id } : t
        );
        setTodos(merged);
        setPageCache("home:todos", userCacheKey, merged, 60_000);
        return updated;
      } catch (error) {
        setTodos(previous);
        setPageCache("home:todos", userCacheKey, previous, 60_000);
        throw error;
      }
    },
    [todos, userCacheKey]
  );

  const deleteTodo = useCallback(async (id) => {
    await deleteTodoApi(id);
    setTodos((prev) => {
      const next = prev.filter((t) => t.id !== id);
      setPageCache("home:todos", userCacheKey, next, 60_000);
      return next;
    });
  }, [userCacheKey]);

  const addNote = useCallback(async (noteData) => {
    const newNote = await createNote(noteData);
    const mapped = { ...newNote, id: newNote._id };
    setNotes((prev) => {
      const next = [mapped, ...prev];
      setPageCache("home:notes", userCacheKey, next, 60_000);
      return next;
    });
    toast.success("Note added");
    return mapped;
  }, [userCacheKey]);

  const updateNote = useCallback(async (id, updates) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...updates } : n));
      setPageCache("home:notes", userCacheKey, next, 60_000);
      return next;
    });
    await updateNoteApi(id, updates);
  }, [userCacheKey]);

  const deleteNote = useCallback(
    async (id) => {
      const oldNotes = [...notes];
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        setPageCache("home:notes", userCacheKey, next, 60_000);
        return next;
      });
      try {
        await deleteNoteApi(id);
        toast.success("Note deleted");
      } catch (error) {
        setNotes(oldNotes);
        setPageCache("home:notes", userCacheKey, oldNotes, 60_000);
        throw error;
      }
    },
    [notes, userCacheKey]
  );

  const value = useMemo(
    () => ({
      todos,
      notes,
      calendarCurrent,
      universityAnnouncements,
      notifications,
      notificationsAll,
      todoLoading,
      noteLoading,
      homeLoading,
      fetchTodos,
      fetchNotes,
      fetchCalendarCurrent,
      fetchUniversityAnnouncements,
      fetchNotifications,
      fetchNotificationsAll,
      fetchAllHomeData,
      addTodo,
      updateTodo,
      toggleTodoComplete,
      deleteTodo,
      addNote,
      updateNote,
      deleteNote,
      setUniversityAnnouncements,
      setNotifications,
    }),
    [
      todos,
      notes,
      calendarCurrent,
      universityAnnouncements,
      notifications,
      notificationsAll,
      todoLoading,
      noteLoading,
      homeLoading,
      fetchTodos,
      fetchNotes,
      fetchCalendarCurrent,
      fetchUniversityAnnouncements,
      fetchNotifications,
      fetchNotificationsAll,
      fetchAllHomeData,
      addTodo,
      updateTodo,
      toggleTodoComplete,
      deleteTodo,
      addNote,
      updateNote,
      deleteNote,
    ]
  );

  return <HomeDataContext.Provider value={value}>{children}</HomeDataContext.Provider>;
}

export function useHomeData() {
  const context = useContext(HomeDataContext);
  if (!context) {
    throw new Error("useHomeData must be used within HomeDataProvider");
  }
  return context;
}
