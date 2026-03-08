import React, { useState } from 'react';
import useNotes from '../hooks/useNotes';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import LightbulbIcon from './shared/LightbulbIcon';

// Simple Note Icon SVG
const NoteIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 512 512">
        <g>
            <path d="M320,170.667h139.52c-7.448-19.736-19.019-37.656-33.941-52.565l-74.325-74.368c-14.927-14.905-32.852-26.468-52.587-33.92   v139.52C298.667,161.115,308.218,170.667,320,170.667z"></path>
            <path d="M468.821,213.333H320c-35.346,0-64-28.654-64-64V0.512C252.565,0.277,249.131,0,245.653,0h-96.32   C90.452,0.071,42.737,47.786,42.667,106.667v298.667C42.737,464.214,90.452,511.93,149.333,512h213.333   c58.881-0.07,106.596-47.786,106.667-106.667V223.68C469.333,220.203,469.056,216.768,468.821,213.333z"></path>
        </g>
    </svg>
);

// Mapped colors from NoteCard (converted to work with bubble)
const BUBBLE_COLORS = {
    default: { bg: "bg-white", border: "border-gray-200", fade: "from-white via-white/90" },
    red: { bg: "bg-[#FFEDED]", border: "border-[#FFCDCD]", fade: "from-[#FFEDED] via-[#FFEDED]/90" },
    orange: { bg: "bg-[#FFF5ED]", border: "border-[#FFDDBB]", fade: "from-[#FFF5ED] via-[#FFF5ED]/90" },
    yellow: { bg: "bg-[#FFFFED]", border: "border-[#FFF9C4]", fade: "from-[#FFFFED] via-[#FFFFED]/90" },
    green: { bg: "bg-[#EDFFED]", border: "border-[#C8E6C9]", fade: "from-[#EDFFED] via-[#EDFFED]/90" },
    teal: { bg: "bg-[#EDFFFF]", border: "border-[#B2EBF2]", fade: "from-[#EDFFFF] via-[#EDFFFF]/90" },
    blue: { bg: "bg-[#EDF5FF]", border: "border-[#BBDEFB]", fade: "from-[#EDF5FF] via-[#EDF5FF]/90" },
    purple: { bg: "bg-[#F5EDFF]", border: "border-[#D1C4E9]", fade: "from-[#F5EDFF] via-[#F5EDFF]/90" },
    pink: { bg: "bg-[#FFEDF5]", border: "border-[#F8BBD0]", fade: "from-[#FFEDF5] via-[#FFEDF5]/90" },
    gray: { bg: "bg-[#F3F4F6]", border: "border-[#E5E7EB]", fade: "from-[#F3F4F6] via-[#F3F4F6]/90" },
};

export default function SharedNoteBubble({ message, isMe, timeString, isSeen, showReadReceipt = true, onOpenDoubt, createdAt }) {
    const { noteData } = message;
    const { addNote } = useNotes();
    const [isExpanded, setIsExpanded] = useState(false);

    if (!noteData) return <div className="text-red-500 text-xs">Invalid Note Data</div>;

    const colorStyle = isMe ? { bg: "bg-[#F0FDF4]", border: "border-[#d1e6d8]" } : (BUBBLE_COLORS[noteData.color] || BUBBLE_COLORS.default);
    const tailRadius = isMe ? "rounded-bl-[20px] rounded-tl-[20px] rounded-tr-[20px] rounded-br-[4px]" : "rounded-br-[20px] rounded-tr-[20px] rounded-tl-[20px] rounded-bl-[4px]";

    const handleSave = async (e) => {
        e.stopPropagation();
        try {
            await addNote({
                title: noteData.title,
                content: noteData.content,
                category: `Shared by ${noteData.sharedBy || 'User'}`,
                // Use preserved watermark if it exists (reshare), otherwise create new signature from sender
                watermark: noteData.watermark
                    ? noteData.watermark
                    : (message.sender?.profile?.name && message.sender?.profile?.regno
                        ? `- ${message.sender.profile.name} (${message.sender.profile.regno})`
                        : (message.sender?.profile?.name
                            ? `- ${message.sender.profile.name}`
                            : (message.sender?.profile?.regno ? `- ${message.sender.profile.regno}` : `- ${noteData.sharedBy}`))),
                isPinned: false,
                color: noteData.color || 'default' // Save with same color
            });
            toast.success("Note saved to your notes!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save note");
        }
    };

    const handleDownload = (e) => {
        e.stopPropagation();
        const element = document.createElement("a");
        const file = new Blob([noteData.content], { type: "text/markdown" });
        element.href = URL.createObjectURL(file);
        element.download = `${noteData.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.md`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div className={`flex flex-col w-[300px] overflow-hidden border ${colorStyle.bg} ${colorStyle.border} ${!isMe ? 'shadow-sm' : ''} ${tailRadius}`}>
            {/* Header */}
            <div className="flex items-center gap-3 p-3 bg-white/30 border-b border-black/5">
                <div className="p-1.5 rounded-lg shrink-0">
                    <NoteIcon />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 text-sm truncate">{noteData.title || "Untitled Note"}</h4>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        Shared by <span className="font-medium text-gray-700">@{noteData.sharedBy}</span>
                    </span>
                </div>
            </div>

            {/* Preview Content */}
            <div className="p-4 text-xs font-medium text-[#1F2937] flex flex-col gap-4 cursor-pointer" onClick={() => setIsExpanded(true)}>
                <div className="line-clamp-6 prose prose-xs max-w-none text-[#1F2937] font-medium">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {noteData.content}
                    </ReactMarkdown>
                </div>
            </div>

            {/* View Modal */}
            {isExpanded && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsExpanded(false)}>
                    <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold">{noteData.title}</h3>
                                <p className="text-xs text-gray-500">Shared by {noteData.sharedBy}</p>
                            </div>
                            <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-gray-200 rounded-full">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none custom-scrollbar">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {noteData.content}
                            </ReactMarkdown>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
                            {!isMe && (
                                <button onClick={handleSave} className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800">
                                    Save to Notes
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MESSAGE FOOTER - Time, Read Receipt, and optionally Check Queries */}
            <div className="border-t border-black/5 flex items-center justify-between px-3 py-2.5 bg-white/10">
                {onOpenDoubt ? (
                    <>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onOpenDoubt(message); }} 
                                className="text-[10px] font-black tracking-wide text-gray-700 hover:text-black transition-colors"
                            >
                                Check Queries
                            </button>
                            <div className="flex items-center gap-3">
                                <button onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }} className="text-slate-500 hover:text-slate-800 transition-colors" title="View">
                                    <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </button>
                                {!isMe && (
                                    <button onClick={handleSave} className="text-slate-500 hover:text-blue-600 transition-colors" title="Save to Notes">
                                        <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                    </button>
                                )}
                                <button onClick={handleDownload} className="text-slate-500 hover:text-green-600 transition-colors" title="Download">
                                    <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {createdAt && (
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                                    {new Date(createdAt).toLocaleDateString()}
                                </span>
                            )}
                            {showReadReceipt && isMe && <LightbulbIcon isSeen={isSeen} />}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-3">
                            <button onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }} className="text-slate-500 hover:text-slate-800 transition-colors" title="View">
                                <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            {!isMe && (
                                <button onClick={handleSave} className="text-slate-500 hover:text-blue-600 transition-colors" title="Save to Notes">
                                    <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                </button>
                            )}
                            <button onClick={handleDownload} className="text-slate-500 hover:text-green-600 transition-colors" title="Download">
                                <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 font-bold">
                            <span>{timeString}</span>
                            {showReadReceipt && isMe && <LightbulbIcon isSeen={isSeen} />}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
