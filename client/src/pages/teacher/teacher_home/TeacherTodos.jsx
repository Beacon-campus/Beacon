import Todos from "../../../components/todocomps/Todos";
import { useHomeData } from "../../../context/HomeDataContext";

export default function TeacherTodos({ user }) {
  const { todos } = useHomeData();

  return (
    <div className="w-full min-h-full h-auto px-0 pt-0 pb-0 min-[769px]:px-0 min-[769px]:pt-0 min-[769px]:pb-0 min-[769px]:h-full min-[769px]:min-h-0 overflow-visible min-[769px]:overflow-hidden">
      <Todos userId={user?.uid || "local-teacher"} />
    </div>
  );
}
