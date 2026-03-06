import apiClient from "./apiClient";

export const loadSketch = async () => {
  const response = await apiClient.get("/sketch");
  return response.data;
};

export const saveSketch = async (data) => {
  const response = await apiClient.post("/sketch", data);
  return response.data;
};