import Todo from "../models/Todo.js";

export const getTodosByUser = async (uid) => {
  return await Todo.find({ userId: uid }).sort({ createdAt: -1 });
};

export const getTodoUserCount = async (uid) => {
  return await Todo.countDocuments({ userId: uid });
};

export const createTodoService = async (todoData) => {
  return await Todo.create(todoData);
};

export const updateTodoService = async (id, uid, updates) => {
  const updatedTodo = await Todo.findOneAndUpdate(
    { _id: id, userId: uid },
    { $set: updates },
    { returnDocument: 'after' }
  );

  if (updatedTodo && updatedTodo.completed === true) {
    const completedCount = await Todo.countDocuments({ userId: uid, completed: true });
    if (completedCount > 10) {
      const oldTodos = await Todo.find({ userId: uid, completed: true })
        .sort({ updatedAt: 1 })
        .limit(completedCount - 10)
        .select("_id");

      if (oldTodos.length > 0) {
        const idsToDelete = oldTodos.map((t) => t._id);
        await Todo.deleteMany({ _id: { $in: idsToDelete } });
      }
    }
  }

  return updatedTodo;
};

export const deleteTodoService = async (id, uid) => {
  return await Todo.findOneAndDelete({ _id: id, userId: uid });
};
