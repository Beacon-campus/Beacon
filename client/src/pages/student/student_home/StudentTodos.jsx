import Todos from "../../../components/todocomps/Todos";
import { useHomeData } from "../../../context/HomeDataContext";

export default function StudentTodos({ user }) {
    const { todos } = useHomeData();

    return (
        <div className="w-full h-full min-h-0 overflow-hidden" data-todo-count={todos.length}>
        <Todos userId={user?.uid || "local-student"} />
    </div>
);
}
