import axios from "axios";
import { auth } from "../firebase/firebase";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (!apiBaseUrl) {
  throw new Error("Missing required env var: VITE_API_BASE_URL");
}

const apiClient = axios.create({
  baseURL: apiBaseUrl,
});

apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Optional global error handler
    console.error("API Error:", error.response?.data?.error || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
