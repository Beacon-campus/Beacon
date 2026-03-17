import { useState } from "react";
import { useHomeData } from "../context/HomeDataContext";

export default function useTodos() {
  const {
    todos,
    todoLoading,
    addTodo: addTodoCached,
    updateTodo: updateTodoCached,
    deleteTodo: deleteTodoCached,
    toggleTodoComplete,
  } = useHomeData();

  const [selectedId, setSelectedId] = useState(null);

  const emitTodosChanged = (action, todoId = null) => {
    window.dispatchEvent(
      new CustomEvent("todos:changed", {
        detail: { action, todoId, at: Date.now() },
      })
    );
  };

  const addTodo = async (todoData) => {
    try {
      const mappedTodo = await addTodoCached(todoData);
      setSelectedId(mappedTodo.id);
      emitTodosChanged("add", mappedTodo.id);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to add task";
      alert(msg);
    }
  };

  const updateTodo = async (id, updates) => {
    try {
      await updateTodoCached(id, updates);
      emitTodosChanged("update", id);
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  const toggleComplete = async (id, currentStatus) => {
    try {
      await toggleTodoComplete(id, currentStatus);
      emitTodosChanged("toggle", id);
    } catch (err) {
      console.error("Toggle failed", err);
    }
  };

  const deleteTodo = async (id) => {
    try {
      await deleteTodoCached(id);
      if (selectedId === id) setSelectedId(null);
      emitTodosChanged("delete", id);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return {
    todos,
    loading: todoLoading,
    error: null,
    selectedId,
    setSelectedId,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
  };
}
