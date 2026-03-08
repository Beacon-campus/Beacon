import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

const COLORS = {
    default: "bg-white",
    red: "bg-[#FFEDED]",
    orange: "bg-[#FFF5ED]",
    yellow: "bg-[#FFFFED]",
    green: "bg-[#EDFFED]",
    teal: "bg-[#EDFFFF]",
    blue: "bg-[#EDF5FF]",
    purple: "bg-[#F5EDFF]",
    pink: "bg-[#FFEDF5]",
    gray: "bg-[#F3F4F6]",
};

export default function CreateNote({ onAdd, onClose, noteCount }) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [color, setColor] = useState("default");
    const [isTitleFocused, setIsTitleFocused] = useState(false);

    // To handle click outside
    const containerRef = useRef(null);

    const handleSubmit = () => {
        if (title.trim() || content.trim()) {
            if (noteCount >= 15) {
                toast.error("You can only create up to 15 notes");
                return;
            }
            // Title character limit check
            if (title.length > 20) {
                toast.error("Title cannot exceed 20 characters");
                return;
            }

            onAdd({ title, content, color });
            onClose();
        } else {
            onClose();
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                ref={containerRef}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-lg transition-all duration-200 shadow-2xl border rounded-xl overflow-hidden ${COLORS[color]} animate-in fade-in zoom-in duration-200`}
            >
                <div className="p-4 flex flex-col gap-2">
                    <input
                        type="text"
                        placeholder="Title"
                        value={title}
                        maxLength={20}
                        onChange={(e) => setTitle(e.target.value)}
                        onFocus={() => setIsTitleFocused(true)}
                        onBlur={() => setIsTitleFocused(false)}
                        className={`w-full text-xl font-bold placeholder-gray-400 bg-transparent border-none outline-none focus:ring-0 p-0 ${COLORS[color]}`}
                        autoFocus
                    />
                    {isTitleFocused && title.length >= 20 && (
                        <p className="text-red-500 text-xs font-medium">
                            Max 20 characters allowed
                        </p>
                    )}
                    <textarea
                        placeholder="Take a note..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[150px] flex-1 resize-none border-none outline-none text-gray-700 placeholder-gray-400 soft-scrollbar"
                    />

                    <div className="flex items-center justify-between mt-4 pt-2 border-t border-black/5">
                        {/* Color Palette (Simple Row) */}
                        <div className="flex gap-2 overflow-x-auto p-1 no-scrollbar items-center">
                            {Object.keys(COLORS).map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-6 h-6 shrink-0 rounded-full border transition-transform hover:scale-105 ${COLORS[c].split(' ')[0]} ${color === c ? 'ring-2 ring-gray-400 ring-offset-1 border-gray-400' : 'border-gray-200'}`}
                                    title={c}
                                />
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="text-sm font-medium text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-black/5"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="text-sm font-medium text-white bg-black hover:opacity-80 px-4 py-1.5 rounded-lg transition-opacity shadow-sm"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
