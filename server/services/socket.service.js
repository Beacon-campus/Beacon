import { Server } from "socket.io";
import Message from "../models/Message.js";
import Channel from "../models/Channel.js";

const initializeSocket = (server, app, allowedOrigins = ["http://localhost:5173"]) => {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    },
  });

  if (app) {
    app.set("io", io);
  }

  // Track online users: socketId -> userId
  const userSocketMap = new Map();

  io.on("connection", (socket) => {
    console.log(`Socket Connected: ${socket.id}`);

    socket.on("join_room", (channelId) => {
      if (!channelId) return;
      console.log(`Server received join_room from ${socket.id} for room: ${channelId}`);

      // Ensure one user room per socket to avoid cross-account event leaks.
      if (channelId.startsWith("user:")) {
        const existingUserRooms = Array.from(socket.rooms).filter(
          (room) => room.startsWith("user:") && room !== channelId
        );
        existingUserRooms.forEach((room) => socket.leave(room));
      }

      socket.join(channelId);

      const isInRoom = socket.rooms.has(channelId);

      if (channelId.startsWith("user:")) {
        const userId = channelId.split(":")[1];
        if (userId) {
          userSocketMap.set(socket.id, userId);
          const onlineUsers = [...new Set(userSocketMap.values())];
          io.emit("online_users_update", onlineUsers);
        }
      }

      socket.emit("room_joined", {
        room: channelId,
        socketId: socket.id,
        success: isInRoom,
      });
    });

    socket.on("leave_room", (channelId) => {
      if (!channelId) return;
      socket.leave(channelId);

      if (channelId.startsWith("user:")) {
        const currentMappedUser = userSocketMap.get(socket.id);
        const roomUserId = channelId.split(":")[1];
        if (currentMappedUser && roomUserId && currentMappedUser === roomUserId) {
          userSocketMap.delete(socket.id);
          const onlineUsers = [...new Set(userSocketMap.values())];
          io.emit("online_users_update", onlineUsers);
        }
      }
    });

    socket.on("send_message", async (data) => {
      console.log("Socket received message:", data.text);

      try {
        const channel = await Channel.findById(data.channelId);
        if (!channel) return;

        if (channel.type === "project_group" && channel.deadline) {
          const deadlineDate = new Date(channel.deadline);
          if (!Number.isNaN(deadlineDate.getTime())) {
            deadlineDate.setHours(23, 59, 59, 999);
            if (new Date() > deadlineDate) {
              socket.emit("send_error", {
                code: "GROUP_EXPIRED",
                channelId: data.channelId,
                message: "This group has expired. Messaging is disabled.",
              });
              return;
            }
          }
        }

        const newMessage = await Message.create({
          channelId: data.channelId,
          sender: data.senderId,
          text: data.text,
          gifUrl: data.gifUrl,
          type: data.type || "text",
          noteData: data.noteData || null,
          readBy: [data.senderId],
        });

        let lastMsgText = data.text;
        if (!lastMsgText && data.gifUrl) lastMsgText = "GIF";
        if (!lastMsgText && data.type === "note") lastMsgText = "Shared a Note";
        if (!lastMsgText && data.type === "image") lastMsgText = "Shared an Image";
        if (!lastMsgText && data.type === "file") {
          lastMsgText = data.noteData?.name ? `Shared file: ${data.noteData.name}` : "Shared a File";
        }

        await Channel.findByIdAndUpdate(data.channelId, {
          lastMessage: {
            text: lastMsgText,
            sender: data.senderId,
            sentAt: new Date(),
          },
        });

        const broadcastMessage = {
          _id: newMessage._id,
          customId: data.customId,
          channelId: data.channelId,
          text: data.text,
          gifUrl: newMessage.gifUrl,
          type: newMessage.type,
          noteData: newMessage.noteData,
          readBy: newMessage.readBy,
          createdAt: newMessage.createdAt,
          sender: {
            _id: data.senderId,
            profile: data.senderProfile,
            firebaseUid: data.firebaseUid,
          },
        };

        io.to(data.channelId).emit("receive_message", broadcastMessage);

        if (channel && channel.participants) {
          channel.participants.forEach((participantId) => {
            const userRoom = `user:${participantId.toString()}`;

            io.to(userRoom).emit("event", {
              type: "CHAT_UPDATED",
              payload: {
                channelId: data.channelId,
                lastMessage: {
                  text: lastMsgText,
                  sender: data.senderId,
                  sentAt: newMessage.createdAt,
                  type: data.type || "text",
                  gif: data.gifUrl || null,
                  noteTitle: data.noteData?.title || null,
                },
                unreadCount: 1,
              },
              timestamp: Date.now(),
            });
          });
        }
      } catch (error) {
        console.error("Socket Save Error:", error);
      }
    });

    socket.on("typing_start", ({ channelId, userId, userName }) => {
      socket.to(channelId).emit("user_typing_start", { userId, userName, channelId });
    });

    socket.on("typing_end", ({ channelId, userId }) => {
      socket.to(channelId).emit("user_typing_end", { userId, channelId });
    });

    socket.on("mark_messages_seen", async ({ channelId, userId }) => {
      try {
        await Message.updateMany(
          { channelId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );

        io.to(channelId).emit("messages_seen", { channelId, userId });
      } catch (error) {
        console.error("Mark Seen Error:", error);
      }
    });

    socket.on("disconnect", () => {
      const userId = userSocketMap.get(socket.id);
      if (userId) {
        userSocketMap.delete(socket.id);
        const onlineUsers = [...new Set(userSocketMap.values())];
        io.emit("online_users_update", onlineUsers);
      }
    });
  });
};

export default initializeSocket;
