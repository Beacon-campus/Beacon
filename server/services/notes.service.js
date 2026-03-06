import Note from "../models/Note.js";

export const getNotesByUser = async (uid) => {
    return await Note.find({ userId: uid }).sort({ isPinned: -1, createdAt: -1 });
};

export const createNoteService = async (noteData) => {
    return await Note.create(noteData);
};

export const updateNoteService = async (id, uid, updates) => {
    return await Note.findOneAndUpdate(
        { _id: id, userId: uid },
        { $set: updates },
        { new: true }
    );
};

export const deleteNoteService = async (id, uid) => {
    return await Note.findOneAndDelete({ _id: id, userId: uid });
};
