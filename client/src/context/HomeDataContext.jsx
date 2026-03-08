import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  const [todos, setTodos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [universityAnnouncements, setUniversityAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [todoLoading, setTodoLoading] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [homeLoading, setHomeLoading] = useState(false);

  useEffect(() => {
    if (user) return;
    setTodos([]);
    setNotes([]);
    setUniversityAnnouncements([]);
    setNotifications([]);
  }, [user]);

  const fetchTodos = useCallback(
    async (force = false) => {
      if (!user) return [];
      if (!force && todos.length > 0) return todos;

      setTodoLoading(true);
      try {
        const data = await fetchTodosApi();
        const mapped = (data || []).map((t) => ({ ...t, id: t._id }));
        setTodos(mapped);
        return mapped;
      } finally {
        setTodoLoading(false);
      }
    },
    [user, todos]
  );

  const fetchNotes = useCallback(
    async (force = false) => {
      if (!user) return [];
      if (!force && notes.length > 0) return notes;

      setNoteLoading(true);
      try {
        const data = await fetchNotesApi();
        const mapped = (data || []).map((n) => ({ ...n, id: n._id }));
        setNotes(mapped);
        return mapped;
      } finally {
        setNoteLoading(false);
      }
    },
    [user, notes]
  );

  const fetchUniversityAnnouncements = useCallback(
    async (force = false, limit = 8) => {
      if (!user) return [];
      if (!force && universityAnnouncements.length > 0) return universityAnnouncements;

      const data = await fetchRecentUniversityAnnouncements(limit);
      const normalized = (data || []).map((item) => ({
        ...item,
        text: item.message,
        sender: item.createdBy?.name || "Admin",
      }));
      setUniversityAnnouncements(normalized);
      return normalized;
    },
    [user, universityAnnouncements]
  );

  const fetchNotifications = useCallback(
    async (force = false, limit = 8) => {
      if (!user) return [];
      if (!force && notifications.length > 0) return notifications;

      const { data } = await apiClient.get("/notifications");
      const latest = (data || [])
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
        }));

      setNotifications(latest);
      return latest;
    },
    [user, notifications]
  );

  const fetchAllHomeData = useCallback(
    async (force = false) => {
      if (!user) return;
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
      universityAnnouncements.length,
      notifications.length,
      fetchTodos,
      fetchNotes,
      fetchUniversityAnnouncements,
      fetchNotifications,
    ]
  );

  const addTodo = useCallback(async (todoData) => {
    const newTodo = await createTodo(todoData);
    const mapped = { ...newTodo, id: newTodo._id };
    setTodos((prev) => [mapped, ...prev]);
    return mapped;
  }, []);

  const updateTodo = useCallback(async (id, updates) => {
    const updated = await updateTodoApi(id, updates);
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updated, id: updated._id } : t))
    );
    return updated;
  }, []);

  const toggleTodoComplete = useCallback(
    async (id, currentStatus) => {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: currentStatus } : t))
      );
      try {
        await updateTodoApi(id, { completed: currentStatus });
        await fetchTodos(true);
      } catch (error) {
        await fetchTodos(true);
        throw error;
      }
    },
    [fetchTodos]
  );

  const deleteTodo = useCallback(async (id) => {
    await deleteTodoApi(id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addNote = useCallback(async (noteData) => {
    const newNote = await createNote(noteData);
    const mapped = { ...newNote, id: newNote._id };
    setNotes((prev) => [mapped, ...prev]);
    toast.success("Note added");
    return mapped;
  }, []);

  const updateNote = useCallback(async (id, updates) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
    await updateNoteApi(id, updates);
  }, []);

  const deleteNote = useCallback(
    async (id) => {
      const oldNotes = [...notes];
      setNotes((prev) => prev.filter((n) => n.id !== id));
      try {
        await deleteNoteApi(id);
        toast.success("Note deleted");
      } catch (error) {
        setNotes(oldNotes);
        throw error;
      }
    },
    [notes]
  );

  const value = useMemo(
    () => ({
      todos,
      notes,
      universityAnnouncements,
      notifications,
      todoLoading,
      noteLoading,
      homeLoading,
      fetchTodos,
      fetchNotes,
      fetchUniversityAnnouncements,
      fetchNotifications,
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
      universityAnnouncements,
      notifications,
      todoLoading,
      noteLoading,
      homeLoading,
      fetchTodos,
      fetchNotes,
      fetchUniversityAnnouncements,
      fetchNotifications,
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
