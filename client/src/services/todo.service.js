import apiClient from "./apiClient";

export const fetchTodos = async () => {
  const response = await apiClient.get("/todos");
  return response.data;
};

export const createTodo = async (todoData) => {
  const response = await apiClient.post("/todos", todoData);
  return response.data;
};

export const updateTodoApi = async (id, updates) => {
  const response = await apiClient.put(`/todos/${id}`, updates);
  return response.data;
};

export const deleteTodoApi = async (id) => {
  const response = await apiClient.delete(`/todos/${id}`);
  return response.data;
};