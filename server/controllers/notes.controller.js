import {
    getNotesByUser,
    createNoteService,
    updateNoteService,
    deleteNoteService
} from "../services/notes.service.js";

export const getNotes = async (req, res) => {
    try {
        const { uid } = req.user;
        const notes = await getNotesByUser(uid);
        res.json(notes);
    } catch (err) {
        console.error("❌ GET NOTES ERROR:", err);
        res.status(500).json({ error: "Failed to fetch notes" });
    }
};

export const createNote = async (req, res) => {
    try {
        const { title, content, isPinned, color, category, watermark } = req.body;
        const { uid, role } = req.user;

        if (!title && !content) {
            return res.status(400).json({ error: "Note must have title or content" });
        }

        const newNote = await createNoteService({
            title: title || "",
            content: content || "",
            isPinned: isPinned || false,
            color: color || "default",
            category: category || "",
            watermark: watermark || "",
            userId: uid,
            role: role || "student",
        });

        res.status(201).json(newNote);
    } catch (err) {
        console.error("🔥 POST NOTE ERROR:", err);
        res.status(500).json({ error: "Server error: " + err.message });
    }
};

export const updateNote = async (req, res) => {
    try {
        const { uid } = req.user;
        const { id } = req.params;
        const updates = req.body;

        const updatedNote = await updateNoteService(id, uid, updates);

        if (!updatedNote) return res.status(404).json({ error: "Note not found" });

        res.json(updatedNote);
    } catch (err) {
        console.error("❌ PUT NOTE ERROR:", err);
        res.status(500).json({ error: "Failed to update note" });
    }
};

export const deleteNote = async (req, res) => {
    try {
        const { uid } = req.user;
        const deleted = await deleteNoteService(req.params.id, uid);
        
        if (!deleted) return res.status(404).json({ error: "Note not found" });
        
        res.json({ message: "Deleted" });
    } catch (err) {
        console.error("❌ DELETE NOTE ERROR:", err);
        res.status(500).json({ error: "Failed to delete note" });
    }
};
