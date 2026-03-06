import {
  getTodosByUser,
  getTodoUserCount,
  createTodoService,
  updateTodoService,
  deleteTodoService,
} from "../services/todos.service.js";

export const getTodos = async (req, res) => {
  try {
    const { uid } = req.user;
    const todos = await getTodosByUser(uid);
    res.json(todos);
  } catch (err) {
    console.error("❌ GET ERROR:", err);
    res.status(500).json({ error: "Failed to fetch todos" });
  }
};

export const createTodo = async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;
    const { uid, role } = req.user;

    if (!title) return res.status(400).json({ error: "Title is required" });

    const currentCount = await getTodoUserCount(uid);
    if (currentCount >= 30) {
      return res.status(400).json({ error: "Task limit reached (30)." });
    }

    const newTodo = await createTodoService({
      title,
      description: description || "",
      dueDate: dueDate || null,
      userId: uid,
      role: role || "student",
      completed: false,
    });

    res.status(201).json(newTodo);
  } catch (err) {
    console.error("🔥 POST ERROR:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
};

export const updateTodo = async (req, res) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const updates = req.body;

    const updatedTodo = await updateTodoService(id, uid, updates);

    if (!updatedTodo) return res.status(404).json({ error: "Todo not found" });

    res.json(updatedTodo);
  } catch (err) {
    console.error("❌ PUT ERROR:", err);
    res.status(500).json({ error: "Failed to update todo" });
  }
};

export const deleteTodo = async (req, res) => {
  try {
    const { uid } = req.user;
    const deleted = await deleteTodoService(req.params.id, uid);
    if (!deleted) return res.status(404).json({ error: "Todo not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("❌ DELETE ERROR:", err);
    res.status(500).json({ error: "Failed to delete" });
  }
};
