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

  // COUNTS
  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

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
      <div className="w-3/5 bg-white border border-gray-200 rounded-2xl flex flex-col h-full shadow-sm overflow-hidden">

        {/* Header & Tabs */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <div className="flex bg-gray-100 p-1 rounded-xl">
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
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
                    ? "bg-gray-200 text-primary border-gray-300 translate-x-1 shadow-sm" // Selected: Grey
                    : "bg-white text-gray-600 border-gray-200" // Unselected: White
                  }
                  hover:bg-primary hover:text-white hover:border-primary hover:shadow-md
                `}
              >
                {/* Checkbox Container */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleComplete(todo.id, !todo.completed);
                  }}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors 
                    ${todo.completed
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-400 group-hover:border-gray-500 group-hover:bg-gray-700"
                    }`}
                >
                  {todo.completed && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                </div>

                <span className={`text-sm font-medium truncate ${todo.completed ? "line-through opacity-60" : ""}`}>
                  {todo.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Bar */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <button
            onClick={() => setShowModal(true)}
            disabled={todos.length >= MAX_TOTAL} // Disable if limit reached
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl shadow-sm font-medium transition-all ${todos.length >= MAX_TOTAL
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-primary text-white hover:bg-black"
              }`}
          >
            {todos.length >= MAX_TOTAL ? "Task Limit Reached (30)" : <><PlusIcon /> New Task</>}
          </button>
        </div>
      </div>

      {/* --- RIGHT PANEL: DETAILS --- */}
      <div className="w-2/5 bg-white border border-gray-200 rounded-2xl p-6 flex flex-col h-full shadow-sm">
        {selectedTodo ? (
          <>
            {/* Header: Title */}
            <div className="mb-6">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Task Title</span>
                {!selectedTodo.completed && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1 rounded-full"
                  >
                    Edit
                  </button>
                )}
              </div>
              <h2 className={`text-2xl font-bold leading-tight ${selectedTodo.completed ? "text-gray-400 line-through" : "text-primary"}`}>
                {selectedTodo.title}
              </h2>
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

              {selectedTodo.completed && (
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Status</span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                    Completed
                  </span>
                </div>
              )}
            </div>

            {/* Description Body */}
            <div className="flex-1 overflow-y-auto mb-4 pr-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block sticky top-0 bg-white">Description</span>
              {selectedTodo.description ? (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedTodo.description}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400 italic text-sm p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No detailed description provided.
                </p>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto pt-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => toggleComplete(selectedTodo.id, !selectedTodo.completed)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-all ${!selectedTodo.completed
                    ? "bg-white border-gray-200 text-primary hover:bg-gray-50 hover:border-gray-300 shadow-sm"
                    : "bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200"
                  }`}
              >
                <CheckIcon /> {selectedTodo.completed ? "Mark Incomplete" : "Complete Task"}
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-14 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
                title="Delete Task"
              >
                <TrashIcon />
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