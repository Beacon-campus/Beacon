import { useEffect } from "react";
import Todos from "../../../components/todocomps/Todos";
import { useHomeData } from "../../../context/HomeDataContext";

export default function TeacherTodos({ user }) {
  const { todos, fetchTodos } = useHomeData();

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  return (
    <div className="w-full h-full min-h-0 bg-white p-4 rounded-lg shadow-sm overflow-hidden" data-todo-count={todos.length}>
      <Todos userId={user?.uid || "local-teacher"} />
    </div>
  );
}
