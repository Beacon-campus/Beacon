import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import socket from "../services/socket.service";
import toast from "react-hot-toast";
import notifSound from "../assets/sounds/notif.mp3";

export default function SocketManager() {
  const { user, refreshUser } = useAuth();
  const { setOnlineUsers } = useChat();
  const roomName = user?._id ? `user:${user._id}` : null;

  const playSound = () => {
    if (!document.hidden && document.hasFocus()) return;
    const audio = new Audio(notifSound);
    audio.play().catch((e) => console.log("Audio play failed (interaction needed):", e));
  };

  useEffect(() => {
    if (!user || !user.uid || !user._id || !roomName) return;

    const isStudent = user.role === "student";

    const joinRoom = () => {
      socket.emit("join_room", roomName);
    };

    const onConnect = () => {
      joinRoom();
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.on("connect", onConnect);
    }

    const handleSocketEvent = (event) => {
      if (!event || !event.type) return;

      switch (event.type) {
        case "FRIEND_REQUEST_RECEIVED":
          if (!isStudent) break;
          toast(`New friend request from ${event.payload?.senderName || "Someone"}`, { icon: "!" });
          refreshUser();
          playSound();
          break;

        case "FRIEND_REQUEST_ACCEPTED": {
          if (!isStudent) break;
          const accepterId = event.payload?.accepterId?.toString();
          if (!accepterId || accepterId === user._id.toString()) break;
          toast.success(`${event.payload?.accepterName || "Someone"} accepted your friend request!`);
          refreshUser();
          break;
        }

        case "FRIEND_REQUEST_DECLINED":
          if (!isStudent) break;
          toast.error("Friend request declined.");
          refreshUser();
          break;

        case "FRIEND_REMOVED": {
          if (!isStudent) break;
          const removerId = event.payload?.removerId?.toString();
          if (!removerId || removerId === user._id.toString()) break;
          toast.error(`You were unfriended by ${event.payload?.removerName || "someone"}.`);
          refreshUser();
          break;
        }

        default:
          break;
      }
    };

    socket.on("room_joined", () => {});
    socket.on("online_users_update", (users) => setOnlineUsers(users));
    socket.on("event", handleSocketEvent);

    return () => {
      socket.off("event", handleSocketEvent);
      socket.off("room_joined");
      socket.off("connect", onConnect);
      socket.off("online_users_update");
      socket.emit("leave_room", roomName);
    };
  }, [user, roomName, refreshUser, setOnlineUsers]);

  return null;
}

