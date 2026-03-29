import useNotes from "../../hooks/useNotes.js";
import CreateNote from './CreateNote';
import MarkdownHelp from './MarkdownHelp';
// import { Info } from 'lucide-react'; // Removed dependency
import NoteCard from "./NoteCard.jsx";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import LoadingState from "../ui/LoadingState";

// Modal for viewing and editing
const EditModal = ({ note, onClose, onUpdate, onAdd }) => {
    // Hooks must be called unconditionally
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(note?.title || "");
    const [content, setContent] = useState(note?.content || "");

    if (!note) return null;

    const isShared = note.category && note.category.startsWith("Shared by");
    const isWatermarked = !!note.watermark;
    const isReadOnlyOriginal = (isShared || isWatermarked) && !isEditing;

    // Sync state if note changes (optional, but good practice)
    // useEffect(() => { setTitle(note.title); setContent(note.content); }, [note]);

    const handleSave = () => {
        if (isShared || isWatermarked) {
            onAdd({
                title: title,
                content: content,
                isPinned: false,
                color: note.color,
                category: "",
                watermark: ""
            });
            toast.success("Saved as a new note (Original preserved)");
        } else {
            onUpdate(note.id, { title, content }); // Include title updates too
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setContent(note.content);
        setTitle(note.title); // Also reset title
        setIsEditing(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className={`w-full max-w-[600px] bg-white rounded-xl shadow-2xl p-6 flex flex-col animate-in fade-in zoom-in duration-200 max-h-[85vh]`}>

                {!isEditing ? (
                    <>
                        <div className="flex justify-between items-start mb-4 gap-4">
                            <h3 className="text-xl font-bold text-gray-800 break-words flex-1 leading-tight">
                                {note.title || <span className="text-gray-400 italic">No Title</span>}
                            </h3>
                            <div className="flex items-center gap-1 shrink-0">
                                <button 
                                    onClick={() => setIsEditing(true)} 
                                    className="p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors group relative"
                                    title="Edit Note"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto pr-2 soft-scrollbar flex-1 min-h-[100px] prose prose-sm max-w-none text-gray-700">
                            {note.content ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                            ) : (
                                <p className="text-gray-400 italic">No content</p>
                            )}
                        </div>

                        {/* Watermark in View Mode */}
                        {note.watermark && (
                            <div className="mt-4 text-right text-sm text-black italic font-medium select-none border-t border-gray-100 pt-2">
                                {note.watermark}
                            </div>
                        )}
                    </>
                ) : (
                    /* Edit Mode - Reduced for shared notes? No, enable full edit but save as copy */
                    <>
                        {(isShared || isWatermarked) && (
                            <div className="text-red-500 text-xs font-bold text-center animate-pulse">
                                Editing and saving this note will create a new note
                            </div>
                        )}
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)} // Fixed: added onChange
                            placeholder="Title"
                            className="text-xl font-bold border-none outline-none placeholder-gray-400 bg-transparent"
                        />
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Note content"
                            className="min-h-[200px] flex-1 resize-none border-none outline-none text-gray-700 placeholder-gray-400 soft-scrollbar"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-auto">
                            <button onClick={handleCancel} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-black text-white rounded-lg hover:opacity-80">
                                {(isShared || isWatermarked) ? "Save as Copy" : "Save"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

import ShareNoteModal from './ShareNoteModal';

// ... imports

export default function Notes() {
    const { notes, addNote, updateNote, deleteNote, loading } = useNotes();
    const [editingNote, setEditingNote] = useState(null);
    const [sharingNote, setSharingNote] = useState(null); // SHARE STATE
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    // Sync editingNote with latest notes state
    useEffect(() => {
        if (editingNote) {
            const updatedNote = notes.find(n => n.id === editingNote.id);
            if (updatedNote) {
                setEditingNote(updatedNote);
            }
        }
    }, [notes, editingNote?.id]);

    const addNewNote = (newNote) => {
        addNote(newNote);
        setIsCreateOpen(false);
    };

    // CATEGORIZATION LOGIC
    const pinnedNotes = notes.filter(n => n.isPinned);

    // "Shared By" Notes: Assuming they have 'category' starting with "Shared by" or similar property
    const sharedNotes = notes.filter(n => !n.isPinned && n.category && n.category.startsWith("Shared by"));

    // Others: Not pinned AND Not shared
    const otherNotes = notes.filter(n => !n.isPinned && (!n.category || !n.category.startsWith("Shared by")));

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500">
                <LoadingState size="md" />
            </div>
        );
    }

    return (
        <div className="w-full h-full p-4 flex flex-col">
            <div className="flex-1 flex flex-col premium-card overflow-hidden relative">

                {/* Header Actions - Now floating to remove structural gap */}
                <div className="absolute top-4 right-6 z-20 flex items-center justify-end">
                    <div className="flex items-center gap-3">
                        {/* Create Note Button (Moved from FAB) */}
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="group flex items-center bg-white text-gray-700 rounded-full shadow-sm hover:shadow-md border border-gray-200 hover:border-[#10B981] hover:text-[#15803D] hover:bg-[#F0FDF4] transition-all duration-500 ease-out h-10 w-10 hover:w-40 overflow-hidden active:scale-95"
                            title="Create Note"
                        >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 w-0 group-hover:w-auto whitespace-nowrap text-sm font-bold pl-0 group-hover:pl-4">
                                Create Note
                            </span>
                            <div className="w-10 h-10 flex items-center justify-center shrink-0 ml-auto group-hover:rotate-90 transition-transform duration-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
                                </svg>
                            </div>
                        </button>

                        <button
                            onClick={() => setIsHelpOpen(true)}
                            className="flex items-center justify-center bg-white text-gray-700 rounded-full shadow-sm hover:shadow-md border border-gray-200 hover:border-[#10B981] hover:text-[#15803D] hover:bg-[#F0FDF4] transition-all duration-300 h-10 w-10 active:scale-95"
                            title="Markdown Guide"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 16v-4" />
                                <path d="M12 8h.01" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Notes Area (Scrollable within Card) */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 soft-scrollbar">
                    <h1 className="text-2xl font-bold text-slate-800 mb-6 ml-1">My Notes</h1>

                    {/* PINNED SECTION */}
                    {pinnedNotes.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-sm font-extrabold text-gray-700 tracking-wide mb-4 ml-1">Pinned Notes</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {pinnedNotes.map(note => (
                                    <NoteCard
                                        key={note.id}
                                        note={note}
                                        onDelete={deleteNote}
                                        onUpdate={updateNote}
                                        onClick={() => setEditingNote(note)}
                                        onShare={() => setSharingNote(note)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SHARED BY SECTION */}
                    {sharedNotes.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-sm font-extrabold text-gray-700 tracking-wide mb-4 ml-1 flex items-center gap-2">
                                Shared With Me
                                <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                    {sharedNotes.length}
                                </span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {sharedNotes.map(note => (
                                    <NoteCard
                                        key={note.id}
                                        note={note}
                                        onDelete={deleteNote}
                                        onUpdate={updateNote}
                                        onClick={() => setEditingNote(note)}
                                        onShare={() => setSharingNote(note)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* OTHERS SECTION */}
                    {(pinnedNotes.length > 0 || sharedNotes.length > 0) && otherNotes.length > 0 && (
                        <h2 className="text-sm font-extrabold text-gray-700 tracking-wide mb-4 ml-1">Other Notes</h2>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {otherNotes.map(note => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                onDelete={deleteNote}
                                onUpdate={updateNote}
                                onClick={() => setEditingNote(note)}
                                onShare={() => setSharingNote(note)}
                            />
                        ))}
                    </div>

                    {notes.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-60">
                            <svg className="w-24 h-24 mb-4 stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            <p className="text-xl font-medium">Notes you add appear here</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editingNote && (
                <EditModal
                    note={editingNote}
                    onClose={() => setEditingNote(null)}
                    onUpdate={updateNote}
                    onAdd={addNote}
                />
            )}

            {/* Share Modal */}
            {sharingNote && (
                <ShareNoteModal
                    note={sharingNote}
                    onClose={() => setSharingNote(null)}
                />
            )}

            {/* Create Note Modal */}
            {isCreateOpen && (
                <CreateNote
                    onAdd={addNewNote}
                    onClose={() => setIsCreateOpen(false)}
                    noteCount={notes.length}
                />
            )}

            {/* Markdown Help Modal */}
            <MarkdownHelp
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
            />
        </div>
    );
}
