import Todos from "../../../components/todocomps/Todos";
import { useHomeData } from "../../../context/HomeDataContext";

export default function TeacherTodos({ user }) {
  const { todos } = useHomeData();

  return (
    <div className="w-full h-full min-h-0 overflow-hidden">
      <Todos userId={user?.uid || "local-teacher"} />
    </div>
  );
}
