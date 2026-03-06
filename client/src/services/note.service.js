import apiClient from "./apiClient";

// 1. Fetch
export const fetchNotes = async () => {
    const res = await apiClient.get("/notes");
    return res.data;
};

// 2. Create
export const createNote = async (noteData) => {
    const res = await apiClient.post("/notes", noteData);
    return res.data;
};

// 3. Update
export const updateNoteApi = async (id, updates) => {
    const res = await apiClient.put(`/notes/${id}`, updates);
    return res.data;
};

// 4. Delete
export const deleteNoteApi = async (id) => {
    const res = await apiClient.delete(`/notes/${id}`);
    return res.data;
};
