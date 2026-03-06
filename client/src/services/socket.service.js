import { io } from "socket.io-client";

// Singleton socket instance
const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL) {
  throw new Error("Missing required env var: VITE_API_BASE_URL");
}
const socketURL = baseURL.replace(/\/api\/?$/, "");

const socket = io(socketURL, {
  autoConnect: true,
  reconnection: true,
});

export default socket;
