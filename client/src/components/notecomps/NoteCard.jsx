import { useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from 'react-hot-toast';

// Icons
const PinIcon = ({ filled }) => (
    <svg
        className={`w-5 h-5 transition-colors ${filled ? "fill-gray-700 text-gray-700" : "fill-transparent text-gray-400 hover:text-gray-700"}`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
);

const ColorIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
);

const DownloadIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
);

const ShareIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
);

const COLORS = {
    default: "bg-white border-gray-200",
    red: "bg-[#FFEDED] border-[#FFCDCD]",
    orange: "bg-[#FFF5ED] border-[#FFDDBB]",
    yellow: "bg-[#FFFFED] border-[#FFF9C4]",
    green: "bg-[#EDFFED] border-[#C8E6C9]",
    teal: "bg-[#EDFFFF] border-[#B2EBF2]",
    blue: "bg-[#EDF5FF] border-[#BBDEFB]",
    purple: "bg-[#F5EDFF] border-[#D1C4E9]",
    pink: "bg-[#FFEDF5] border-[#F8BBD0]",
    gray: "bg-[#F3F4F6] border-[#E5E7EB]",
};

export default function NoteCard({ note, onDelete, onUpdate, onClick, onShare }) {
    const [showColors, setShowColors] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleColorChange = (e, color) => {
        e.stopPropagation();
        onUpdate(note.id, { color });
        setShowColors(false);
    };

    const handlePin = (e) => {
        e.stopPropagation();
        onUpdate(note.id, { isPinned: !note.isPinned });
    };

    const handleDownload = (e) => {
        e.stopPropagation();

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${note.title || 'Note Preview'}</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown-light.min.css">
                <style>
                    body {
                        box-sizing: border-box;
                        min-width: 200px;
                        max-width: 980px;
                        margin: 0 auto;
                        padding: 45px;
                    }
                    @media (max-width: 767px) {
                        body {
                            padding: 15px;
                        }
                    }
                    .markdown-body {
                        font-family: -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
                    }
                </style>
            </head>
            <body>
                <article class="markdown-body" id="content"></article>
                <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
                <script>
                    const markdown = ${JSON.stringify(note.content || "")};
                    document.getElementById('content').innerHTML = marked.parse(markdown);
                </script>
            </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    // Calculate word count for validation
    const wordCount = note.content ? note.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
    const canShare = note.title && note.title.trim().length > 0 && wordCount >= 5;

    return (
        <>
            <div
                className={`group relative rounded-xl border p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col gap-3 ${COLORS[note.color] || COLORS.default} h-full`}
                onClick={() => onClick(note)}
            >
                {/* Pin Button */}
                <button
                    onClick={handlePin}
                    className={`absolute top-2 right-2 p-1.5 rounded-full transition-opacity ${note.isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"} hover:bg-black/5`}
                >
                    <PinIcon filled={note.isPinned} />
                </button>

                {/* Title */}
                {note.title && <h3 className="font-extrabold text-gray-900 pr-6 text-lg tracking-tight break-words leading-tight">{note.title}</h3>}

                {/* Content */}
                {note.content && (
                    <div className="text-gray-600 text-sm break-words prose prose-sm prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-nav:my-1 max-h-[300px] overflow-hidden mask-linear-gradient leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                    </div>
                )}

                {/* If Empty */}
                {!note.title && !note.content && <p className="text-gray-400 italic text-sm">Empty note</p>}

                {/* Actions (visible on hover) */}
                <div className="flex items-center justify-between mt-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {/* Color Picker */}
                    <div className="relative">
                        <button
                            className="p-1.5 rounded-full hover:bg-black/5 text-gray-500 hover:text-gray-800"
                            onClick={(e) => { e.stopPropagation(); setShowColors(!showColors); }}
                        >
                            <ColorIcon />
                        </button>

                        {showColors && (
                            <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-xl border border-gray-200 flex gap-1 z-20 w-max">
                                {Object.keys(COLORS).map(c => (
                                    <div
                                        key={c}
                                        className={`w-5 h-5 rounded-full border cursor-pointer ${COLORS[c].split(' ')[0]} ${note.color === c ? 'ring-2 ring-blue-500' : ''}`}
                                        onClick={(e) => handleColorChange(e, c)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-1">
                        <button
                            className="p-1.5 rounded-full hover:bg-black/5 text-gray-500 hover:text-blue-600"
                            onClick={handleDownload}
                            title="Download as HTML"
                        >
                            <DownloadIcon />
                        </button>
                        <button
                            className={`p-1.5 rounded-full hover:bg-black/5 transition-colors ${canShare ? 'text-gray-500 hover:text-green-600' : 'text-gray-300 cursor-not-allowed'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!canShare) {
                                    if (!note.title || !note.title.trim()) {
                                        toast.error("Note must have a title to share");
                                    } else if (wordCount < 5) {
                                        toast.error("Note must have at least 5 words to share");
                                    }
                                } else {
                                    onShare(note); // TRIGGER SHARE
                                }
                            }}
                            title={canShare ? "Share" : "Note too short or missing title to share"}
                        >
                            <ShareIcon />
                        </button>
                        <button
                            className="p-1.5 rounded-full hover:bg-black/5 text-gray-500 hover:text-red-600"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDeleteModalOpen(true);
                            }}
                        >
                            <TrashIcon />
                        </button>
                    </div>
                </div>
                {/* Watermark inside card */}
                {note.watermark && (
                    <div className="mt-auto pt-3 border-t border-black/5 text-[10px] text-gray-500 font-bold text-right select-none uppercase tracking-widest flex items-center justify-end gap-1.5 opacity-80">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {note.watermark.replace('- ', '')}
                    </div>
                )}
            </div>

            {/* Note Delete Confirmation Modal */}
            {isDeleteModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in duration-200 flex flex-col items-center text-center" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Note?</h3>
                        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                            Are you sure you want to delete this note?<br />
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDeleteModalOpen(false);
                                }}
                                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(note.id);
                                    setIsDeleteModalOpen(false);
                                }}
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white hover:bg-red-600 rounded-lg font-semibold transition-colors shadow-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
