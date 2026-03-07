import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useHomeData } from "../context/HomeDataContext";
import toast from "react-hot-toast";

export default function useNotes() {
  const { user } = useAuth();
  const {
    notes,
    noteLoading,
    fetchNotes,
    addNote: addNoteCached,
    updateNote: updateNoteCached,
    deleteNote: deleteNoteCached,
  } = useHomeData();

  useEffect(() => {
    if (!user) return;
    fetchNotes().catch((err) => {
      console.error("Failed to load notes:", err);
      toast.error("Could not load notes");
    });
  }, [user, fetchNotes]);

  const addNote = async (noteData) => {
    try {
      await addNoteCached(noteData);
    } catch (err) {
      console.error("Add note failed", err);
      toast.error("Failed to add note");
      throw err;
    }
  };

  const updateNote = async (id, updates) => {
    try {
      await updateNoteCached(id, updates);
    } catch (err) {
      console.error("Update note failed", err);
      toast.error("Failed to update note");
    }
  };

  const deleteNote = async (id) => {
    try {
      await deleteNoteCached(id);
    } catch (err) {
      console.error("Delete note failed", err);
      toast.error("Failed to delete note");
    }
  };

  return {
    notes,
    loading: noteLoading,
    addNote,
    updateNote,
    deleteNote,
  };
}
