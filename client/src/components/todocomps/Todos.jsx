import { useState, useEffect } from "react";
// Ensure extensions are correct based on your file structure
import useTodos from "../../hooks/useTodos.js";
import TodoModal from "./TodoModal.jsx";
import ConfirmDeleteModal from "./ConfirmDeleteModal.jsx";

// Icons
const SortIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path></svg>;
const PlusIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>;
const CheckIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>;
const TrashIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>;

export default function Todos({ userId }) {
  const {
    todos,
    selectedId,
    setSelectedId,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
  } = useTodos({ userId });

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortBy, setSortBy] = useState("new");
  const [showSort, setShowSort] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [justCompletedId, setJustCompletedId] = useState(null); // For delayed animation out

  // Handle toggling complete with a small delay for animation
  const handleToggle = (todoId, newStatus) => {
    if (newStatus === true && !showCompleted) {
      setJustCompletedId(todoId);
      toggleComplete(todoId, newStatus);
      setTimeout(() => setJustCompletedId(prev => (prev === todoId ? null : prev)), 600);
    } else {
      toggleComplete(todoId, newStatus);
    }
  };

  // COUNTS & FILTERING
  const activeTodos = todos.filter(t => !t.completed || t.id === justCompletedId);
  const completedTodos = todos.filter(t => t.completed && t.id !== justCompletedId);

  // LIMITS (Matches Backend Logic)
  const MAX_TOTAL = 30; // Total allowed tasks
  const MAX_COMPLETED_HISTORY = 10; // Auto-deletion threshold

  function formatDueDate(dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return due.toLocaleDateString();
  }

  const baseList = showCompleted ? completedTodos : activeTodos;

  const list = [...baseList].sort((a, b) => {
    if (sortBy === "new") return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === "old") return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === "dueFirst") return (new Date(a.dueDate || '9999-12-31')) - (new Date(b.dueDate || '9999-12-31'));
    if (sortBy === "dueLast") return (new Date(b.dueDate || 0)) - (new Date(a.dueDate || 0));
    return 0;
  });

  useEffect(() => {
    const listToUse = showCompleted ? completedTodos : activeTodos;
    if (!selectedId && listToUse.length > 0) {
      setSelectedId(listToUse[0].id);
    }
  }, [showCompleted, todos]);

  const selectedTodo = list.find(t => t.id === selectedId) || null;

  return (
    <div className="flex gap-6 h-full min-h-0 p-2">

      {/* --- LEFT PANEL: LIST --- */}
      <div className="w-3/5 premium-card flex flex-col h-full overflow-hidden">

        {/* Header & Tabs */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-transparent z-10">
          <div className="flex bg-white/50 p-1 rounded-xl">
            {/* Active Tab */}
            <button
              onClick={() => setShowCompleted(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${!showCompleted ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Active
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${!showCompleted ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-500"}`}>
                {activeTodos.length}/{MAX_TOTAL}
              </span>
            </button>

            {/* Completed Tab */}
            <button
              onClick={() => setShowCompleted(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${showCompleted ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Completed
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${showCompleted ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-500"}`}>
                {completedTodos.length}/{MAX_COMPLETED_HISTORY}
              </span>
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSort(p => !p)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <SortIcon />
            </button>

            {showSort && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden py-1">
                {[
                  ["new", "Newest first"],
                  ["old", "Oldest first"],
                  ["dueFirst", "Due date (earliest)"],
                  ["dueLast", "Due date (latest)"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setSortBy(key); setShowSort(false); }}
                    className="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 soft-scrollbar">
          {list.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <p>No tasks found.</p>
            </div>
          )}

          {list.map(todo => {
            const isActive = todo.id === selectedId;
            return (
              <div
                key={todo.id}
                onClick={() => setSelectedId(todo.id)}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 border
                  ${isActive
                    ? "bg-[#F0FDF4] text-[#065F46] border-[#059669] shadow-sm font-medium" 
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50/80 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm" 
                  }
                `}
              >
                {/* Checkbox Container */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(todo.id, !todo.completed);
                  }}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 
                    ${todo.completed
                      ? "bg-[#059669] border-[#059669] text-white animate-[pop_0.3s_ease-out]"
                      : isActive
                        ? "bg-white border-[#059669]" 
                        : "bg-white border-gray-300 group-hover:border-slate-800 group-hover:bg-slate-50"
                    }`}
                >
                  {todo.completed && <svg className="w-3.5 h-3.5 animate-[checkmark_0.3s_ease-in-out]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                </div>

                <span className={`text-sm font-medium truncate capitalize ${todo.completed ? "text-gray-400 line-through opacity-80" : "text-gray-700"}`}>
                  {todo.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Bar */}
        <div className="p-4 border-t border-gray-100 bg-transparent">
          <button
            onClick={() => setShowModal(true)}
            disabled={todos.length >= MAX_TOTAL} // Disable if limit reached
            className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all duration-200 active:scale-95 ${todos.length >= MAX_TOTAL
                ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                : "bg-transparent text-gray-700 border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 shadow-sm hover:shadow"
              }`}
          >
            {todos.length >= MAX_TOTAL ? "Task Limit Reached (30)" : <><PlusIcon /> New Task</>}
          </button>
        </div>
      </div>

      {/* --- RIGHT PANEL: DETAILS --- */}
      <div className="w-2/5 premium-card p-6 flex flex-col h-full">
        {selectedTodo ? (
          <>
            {/* Header: Title */}
            <div className="mb-6">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4 flex-wrap">
                  <h2 className={`text-2xl font-bold leading-tight capitalize ${selectedTodo.completed ? "text-gray-400 line-through" : "text-primary"}`}>
                    {selectedTodo.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedTodo.completed && (
                      <span className="bg-green-50 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full border border-green-200">
                        Completed
                      </span>
                    )}
                    {!selectedTodo.completed && (
                      <button
                        onClick={() => setEditMode(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1 rounded-full group relative overflow-hidden"
                      >
                        <span className="relative z-10 group-hover:underline underline-offset-2">Edit</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Meta: Due Date & Status */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Due Date</span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium border ${selectedTodo.dueDate && formatDueDate(selectedTodo.dueDate) === "Overdue"
                    ? "bg-red-50 text-red-700 border-red-100"
                    : "bg-gray-50 text-gray-700 border-gray-200"
                  }`}>
                  {selectedTodo.dueDate ? formatDueDate(selectedTodo.dueDate) : "No Due Date"}
                </span>
              </div>
            </div>

            {/* Description Body */}
            <div className="flex-1 overflow-y-auto pr-2 soft-scrollbar">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description</p>
              {selectedTodo.description ? (
                <p className={`text-sm whitespace-pre-wrap leading-relaxed ${selectedTodo.completed ? "text-gray-400 line-through opacity-80" : "text-gray-600"}`}>
                  {selectedTodo.description}
                </p>
              ) : selectedTodo.completed ? (
                <div 
                  className="bg-gray-100 border border-transparent rounded-xl p-4 text-center w-full mt-2 cursor-not-allowed opacity-80"
                >
                  <p className="text-sm font-medium text-gray-400 italic">
                    No description provided.
                  </p>
                </div>
              ) : (
                <div 
                  onClick={() => setEditMode(true)}
                  className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-4 text-center cursor-pointer group hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 w-full mt-2"
                >
                  <p className="text-sm font-medium text-gray-500 italic group-hover:text-primary transition-colors">
                    Click to add a description...
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto pt-6 border-t border-gray-100 flex items-stretch gap-3">
              <button
                onClick={() => handleToggle(selectedTodo.id, !selectedTodo.completed)}
                className={`flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-sm hover:shadow
                  ${selectedTodo.completed
                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
                    : "bg-primary text-white hover:bg-black border border-transparent"
                  }`}
              >
                {selectedTodo.completed ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    Mark Incomplete
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    Complete Task
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-12 h-12 flex items-center justify-center bg-white border border-gray-400 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-500 transition-all duration-200 active:scale-95 shadow-sm group"
                title="Delete task"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <p>Select a task to view details</p>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      <ConfirmDeleteModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (selectedTodo) {
            deleteTodo(selectedTodo.id);
            setShowDeleteConfirm(false);
          }
        }}
      />

      <TodoModal
        open={showModal || editMode}
        mode={editMode ? "edit" : "create"}
        initialData={editMode ? selectedTodo : {}}
        onClose={() => {
          setShowModal(false);
          setEditMode(false);
        }}
        onSave={(data) => {
          if (editMode && selectedTodo) {
            updateTodo(selectedTodo.id, { ...data });
          } else {
            addTodo(data);
          }
        }}
      />
    </div>
  );
}