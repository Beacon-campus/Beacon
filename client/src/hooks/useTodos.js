import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext"; 
import { auth } from "../firebase/firebase"; 
import { 
  fetchTodos, 
  createTodo, 
  updateTodoApi, 
  deleteTodoApi 
} from "../services/todo.service";

export default function useTodos() {
  const { user } = useAuth(); 
  
  const [todos, setTodos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const emitTodosChanged = (action, todoId = null) => {
    window.dispatchEvent(
      new CustomEvent("todos:changed", {
        detail: { action, todoId, at: Date.now() },
      })
    );
  };

  // Helper to sync with DB
  const refreshTodos = async () => {
    if (auth.currentUser) {
       const data = await fetchTodos();
       const mappedData = data.map(t => ({ ...t, id: t._id }));
       setTodos(mappedData);
    }
  };

  // 1. Load Todos
  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        setLoading(true);
        if (auth.currentUser) {
            await refreshTodos();
            setError(null);
        }
      } catch (err) {
        console.error("❌ Failed to load todos:", err);
        setError("Could not load tasks.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // 2. Add Todo
  const addTodo = async (todoData) => {
    try {
      if (!auth.currentUser) {
        alert("You must be logged in to create tasks.");
        return;
      }
      const newTodo = await createTodo(todoData);
      
      const mappedTodo = { ...newTodo, id: newTodo._id };
      setTodos((prev) => [mappedTodo, ...prev]);
      setSelectedId(mappedTodo.id);
      emitTodosChanged("add", mappedTodo.id);

    } catch (err) {
      const msg = err.response?.data?.error || "Failed to add task";
      alert(msg);
    }
  };

  // 3. Update Todo
  const updateTodo = async (id, updates) => {
    try {
      const updated = await updateTodoApi(id, updates);
      
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updated, id: updated._id } : t))
      );
      emitTodosChanged("update", id);
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  // 4. Toggle Complete (with AUTO-SYNC)
  const toggleComplete = async (id, currentStatus) => {
    try {
      // 1. Optimistic UI update (looks fast)
      setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: currentStatus } : t));

      // 2. Send to backend
      await updateTodoApi(id, { completed: currentStatus });

      // 3. SYNC: Re-fetch list to catch any auto-deleted tasks
      // This fixes the "Stacking" issue!
      await refreshTodos();
      emitTodosChanged("toggle", id);
      
    } catch (err) {
      console.error("Toggle failed", err);
      // Revert if error
      await refreshTodos(); 
    }
  };

  // 5. Delete Todo
  const deleteTodo = async (id) => {
    try {
      await deleteTodoApi(id);
      
      setTodos((prev) => prev.filter((t) => t.id !== id));
      if (selectedId === id) setSelectedId(null);
      emitTodosChanged("delete", id);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return {
    todos,
    loading,
    error,
    selectedId,
    setSelectedId,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
  };
}
