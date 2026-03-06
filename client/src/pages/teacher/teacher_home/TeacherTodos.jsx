import Todos from "../../../components/todocomps/Todos";

export default function TeacherTodos({ user }) {
  return (
    <div className="w-full h-full min-h-0 bg-white p-4 rounded-lg shadow-sm overflow-hidden">
      <Todos userId={user?.uid || "local-teacher"} />
    </div>
  );
}
