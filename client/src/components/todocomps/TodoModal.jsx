import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; // Import standard styles
import "./datepicker-custom.css"; // We will create this for your custom theme
import Modal from "../ui/Modal";

export default function TodoModal({
  open,
  onClose,
  onSave,
  initialData = {},
  mode = "create",
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(null); // Changed to null for DatePicker
  const [error, setError] = useState("");

  const MAX_TITLE_CHARS = 60; 
  const MAX_DESC_CHARS = 300; 

  useEffect(() => {
    if (open) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      // DatePicker expects a Date object, not a string
      setDueDate(initialData.dueDate ? new Date(initialData.dueDate) : null);
      setError(""); 
    }
  }, [open, initialData]);

  if (!open) return null;

  return (
    <Modal 
      isOpen={open} 
      onClose={onClose} 
      className="max-w-md h-auto"
    >
        
        {/* Header */}
        <div className="bg-white px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">
            {mode === "edit" ? "Edit Task" : "New Task"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          
          {/* Title Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Task Name <span className="text-red-500">*</span>
                </label>
                <span className={`text-xs font-medium ${title.length >= MAX_TITLE_CHARS ? "text-red-500" : "text-gray-400"}`}>
                    {title.length}/{MAX_TITLE_CHARS}
                </span>
            </div>
            <input
              placeholder="e.g. Finish History Essay"
              value={title}
              maxLength={MAX_TITLE_CHARS}
              onChange={e => {
                setTitle(e.target.value);
                if(error) setError("");
              }}
              className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none
                ${error ? "bg-red-50 border-red-200 text-red-900 placeholder-red-300" : "bg-gray-50 border-transparent text-primary placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-primary/10"}
              `}
            />
            {error && <p className="text-red-500 text-xs mt-1 font-medium ml-1">{error}</p>}
          </div>

          {/* Description Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Description
              </label>
              <span className={`text-xs font-medium ${description.length >= MAX_DESC_CHARS ? "text-red-500" : "text-gray-400"}`}>
                {description.length}/{MAX_DESC_CHARS}
              </span>
            </div>
            <textarea
              placeholder="Briefly describe the task..."
              value={description}
              maxLength={MAX_DESC_CHARS}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm bg-gray-50 border-transparent text-primary placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
            />
          </div>

          {/* CUSTOM DatePicker */}
          <div className="custom-datepicker-wrapper">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
              Due Date
            </label>
            <DatePicker 
                selected={dueDate} 
                onChange={(date) => setDueDate(date)}
                dateFormat="MMM d, yyyy"
                placeholderText="Select due date"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none border transition-all cursor-pointer bg-gray-50 text-primary border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm focus:ring-2 focus:ring-primary/10"
                // This renders the calendar icon inside the input
                showIcon
                icon={
                    <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 hover:text-primary transition-all"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              if (!title.trim()) {
                setError("Task name is required");
                return;
              }
              onSave({ 
                title, 
                description, 
                dueDate: dueDate || null 
              });
              onClose();
            }}
            className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-black shadow-lg shadow-primary/20 transition-all transform active:scale-95"
          >
            {mode === "edit" ? "Save Changes" : "Create Task"}
          </button>
        </div>

    </Modal>
  );
}