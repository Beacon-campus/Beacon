import Todo from "../models/Todo.js";
import User from "../models/User.js";

// Helper: Get Mongo _id from Firebase UID
const getUserId = async (firebaseUid) => {
  const user = await User.findOne({ firebaseUid });
  return user ? user._id : null;
};

// @desc    Get all todos for the current user
// @route   GET /api/todos
export const getTodos = async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    if (!userId) return res.status(404).json({ error: "User not found" });

    // Mongoose Magic: .find() returns an array of docs
    const todos = await Todo.find({ userId }).sort({ createdAt: -1 });

    // Rename _id to id for frontend compatibility
    const formattedTodos = todos.map(t => ({
      ...t.toObject(),
      id: t._id.toString()
    }));

    res.json(formattedTodos);
  } catch (err) {
    console.error("Get Todos Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Create a new todo
// @route   POST /api/todos
export const createTodo = async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;

    const userId = await getUserId(req.user.uid);
    if (!userId) return res.status(404).json({ error: "User not found" });

    const newTodo = await Todo.create({
      userId,
      title,
      description,
      dueDate,
      priority,
      completed: false
    });

    res.status(201).json({ 
      ...newTodo.toObject(), 
      id: newTodo._id.toString() 
    });
  } catch (err) {
    console.error("Create Todo Error:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
};

// @desc    Update a todo
// @route   PUT /api/todos/:id
export const updateTodo = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mongoose: findByIdAndUpdate(id, update, options)
    const updatedTodo = await Todo.findByIdAndUpdate(
      id,
      { $set: req.body },
      { returnDocument: 'after' } // Return the updated document
    );

    if (!updatedTodo) return res.status(404).json({ error: "Task not found" });

    res.json({ 
      ...updatedTodo.toObject(), 
      id: updatedTodo._id.toString() 
    });
  } catch (err) {
    console.error("Update Todo Error:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
};

// @desc    Delete a todo
// @route   DELETE /api/todos/:id
export const deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;
    
    const todo = await Todo.findById(id);
    if (!todo) return res.status(404).json({ error: "Task not found" });

    await todo.deleteOne();
    
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("Delete Todo Error:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
};