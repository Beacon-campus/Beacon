import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase/firebase";
import {
    fetchNotes,
    createNote,
    updateNoteApi,
    deleteNoteApi
} from "../services/note.service";
import toast from "react-hot-toast";

export default function useNotes() {
    const { user } = useAuth();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load Notes
    useEffect(() => {
        async function loadData() {
            if (!user) return;
            try {
                setLoading(true);
                if (auth.currentUser) {
                    const data = await fetchNotes();
                    setNotes(data.map(n => ({ ...n, id: n._id })));
                }
            } catch (err) {
                console.error("❌ Failed to load notes:", err);
                toast.error("Could not load notes");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [user]);

    // Add Note
    const addNote = async (noteData) => {
        try {
            const newNote = await createNote(noteData);
            setNotes(prev => [{ ...newNote, id: newNote._id }, ...prev]);
            toast.success("Note added");
        } catch (err) {
            console.error("Add note failed", err);
            toast.error("Failed to add note");
            throw err; // Propage error to caller
        }
    };

    // Update Note
    const updateNote = async (id, updates) => {
        // Optimistic update
        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

        try {
            await updateNoteApi(id, updates);
        } catch (err) {
            console.error("Update note failed", err);
            toast.error("Failed to update note");
            // Revert (could fetch again)
        }
    };

    // Delete Note
    const deleteNote = async (id) => {
        // Optimistic delete
        const oldNotes = [...notes];
        setNotes(prev => prev.filter(n => n.id !== id));

        try {
            await deleteNoteApi(id);
            toast.success("Note deleted");
        } catch (err) {
            console.error("Delete note failed", err);
            toast.error("Failed to delete note");
            setNotes(oldNotes);
        }
    };

    return {
        notes,
        loading,
        addNote,
        updateNote,
        deleteNote
    };
}
