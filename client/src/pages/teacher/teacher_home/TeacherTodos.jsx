import { useEffect } from "react";
import Todos from "../../../components/todocomps/Todos";
import { useHomeData } from "../../../context/HomeDataContext";

export default function TeacherTodos({ user }) {
  const { todos, fetchTodos } = useHomeData();

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  return (
<<<<<<< HEAD
    <div className="w-full h-full min-h-0 overflow-hidden">
=======
    <div className="w-full h-full min-h-0 bg-white p-4 rounded-lg shadow-sm overflow-hidden" data-todo-count={todos.length}>
>>>>>>> 537b0c3f7f2dd727a28c7cc7a517ec4a640ea3aa
      <Todos userId={user?.uid || "local-teacher"} />
    </div>
  );
}
