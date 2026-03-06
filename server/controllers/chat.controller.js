import {
  getUserByUid,
  getTeacherUsers,
  getChannelsByParticipant,
  getChannelById,
  getUnreadMessageCount,
  getUnreadAssignmentMessageCount,
  getVisibleMessages,
  getLatestVisibleAssignmentMessage,
  getClassroomsForStudent,
  getMessagesByChannel,
  getMessagesPageByChannel,
  getClassmatesForGroups,
  getClassmatesForDMs,
  getClassmatesForTeacher,
  getGroupDetailsWithPopulate,
  updateChannelLastMessageAndSave,
  getUserById,
  getUserByRegno,
  getDmChannelByParticipants,
  createDmChannel,
  getPopulatedChannel,
  getUsersInRegnos,
  createProjectGroupChannel,
  syncClassroomsForUser,
  createNewMessage,
  updateChannelLastMessage,
  getPopulatedMessage,
  getMessageById,
  getLatestMessageForChannel,
  updateChannelLastMessageDeleted,
  removeParticipantFromChannel,
  deleteChannelById
} from "../services/chat.service.js";
import User from "../models/User.js";

export const getMyChannels = async (req, res) => {
  try {
    const user = await getUserByUid(req.user.uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    const channels = await getChannelsByParticipant(user._id);
    const plainChannels = [];
    
    for (const channel of channels) {
        const channelObj = channel.toObject();
        
        const myReadStatus = channel.readStatus?.find(s => s.user.equals(user._id));
        const lastReadAt = myReadStatus ? myReadStatus.lastReadAt : new Date(0);
        
        const unreadCount = await getUnreadMessageCount(channel._id, lastReadAt, user._id);
        const visibleMessages = await getVisibleMessages(channel._id, user._id);
        
        if (visibleMessages.length > 0) {
            const lastMsg = visibleMessages[0];
            channelObj.lastMessage = {
                text: lastMsg.isDeleted ? "🚫 This message was deleted" : lastMsg.text,
                sender: lastMsg.sender,
                sentAt: lastMsg.sentAt,
                isDeleted: lastMsg.isDeleted || false
            };
        } else {
            channelObj.lastMessage = {
                text: "No messages yet",
                sender: null,
                sentAt: null
            };
        }
        
        channelObj.unreadCount = unreadCount;
        plainChannels.push(channelObj);
    }

    let peers = plainChannels.filter((c) => c.type === "dm");
    
    if (user.role === "student") {
        peers = peers.filter(c => {
             const other = c.participants.find(p => p._id.toString() !== user._id.toString());
             if (other && other.role !== "student") return true;
             return other && user.friends.some(fId => fId.equals(other._id));
        });
    }

    const secondary = plainChannels.filter((c) => c.type !== "dm");

    let teacherChats = [];
    if (user.role === "student") {
      const assignmentReplyNotifications = (user.notifications || [])
        .filter((n) => n?.type === "ASSIGNMENT_DOUBT_REPLY")
        .filter((n) => n?.classroomId && n?.teacherId && (n?.timestamp || n?.createdAt))
        .map((n) => ({
          classroomId: String(n.classroomId),
          teacherId: String(n.teacherId),
          text: n.replyText || n.content || "Teacher replied to an assignment doubt",
          sentAt: new Date(n.timestamp || n.createdAt),
          type: "assignment_doubt_reply",
          read: Boolean(n.read),
        }));

      const latestReplyByTeacherClass = new Map();
      const unreadReplyCountByTeacherClass = new Map();
      assignmentReplyNotifications.forEach((n) => {
        const key = `${n.classroomId}_${n.teacherId}`;
        const existing = latestReplyByTeacherClass.get(key);
        if (!existing || new Date(n.sentAt) > new Date(existing.sentAt)) {
          latestReplyByTeacherClass.set(key, n);
        }
        if (!n.read) {
          unreadReplyCountByTeacherClass.set(key, (unreadReplyCountByTeacherClass.get(key) || 0) + 1);
        }
      });

      const classrooms = await getClassroomsForStudent(user._id);

      const teacherPairs = [];
      classrooms.forEach((cls) => {
        (cls.subjects || []).forEach((subject) => {
          (subject.teacherIds || []).forEach((teacherId) => {
            teacherPairs.push({
              classroomId: String(cls._id),
              classroomName: cls.name,
              channelId: cls.officialChannelId ? String(cls.officialChannelId) : null,
              teacherId: String(teacherId),
              subjectName: subject.name || "",
            });
          });
        });
      });

      const uniqueTeacherIds = [...new Set(teacherPairs.map((p) => p.teacherId))];
      const teacherUsers = await getTeacherUsers(uniqueTeacherIds);
      const teacherMap = new Map(teacherUsers.map((t) => [String(t._id), t]));

      const uniqueTeacherChannelPairs = [
        ...new Set(
          teacherPairs
            .filter((p) => p.channelId && p.teacherId)
            .map((p) => `${p.channelId}__${p.teacherId}`)
        ),
      ];
      const teacherChannelMetaByKey = new Map();

      for (const pairKey of uniqueTeacherChannelPairs) {
        const [channelId, teacherId] = pairKey.split("__");
        const channelDoc = channels.find((c) => String(c._id) === String(channelId));
        const myReadStatus = channelDoc?.readStatus?.find((s) => s.user.equals(user._id));
        const lastReadAt = myReadStatus ? myReadStatus.lastReadAt : new Date(0);

        const assignmentUnreadCount = await getUnreadAssignmentMessageCount(channelId, lastReadAt, user._id, teacherId);
        const latestAssignmentMessage = await getLatestVisibleAssignmentMessage(channelId, user._id, teacherId);

        teacherChannelMetaByKey.set(pairKey, {
          unreadCount: assignmentUnreadCount,
          lastMessage: latestAssignmentMessage
            ? {
                text: latestAssignmentMessage.isDeleted
                  ? "This assignment message was deleted"
                  : latestAssignmentMessage.text,
                sender: latestAssignmentMessage.sender,
                sentAt: latestAssignmentMessage.sentAt || latestAssignmentMessage.createdAt,
                isDeleted: latestAssignmentMessage.isDeleted || false,
                type: latestAssignmentMessage.type || "assignment",
              }
            : null,
        });
      }

      teacherChats = teacherPairs
        .filter((p) => p.channelId && teacherMap.has(p.teacherId))
        .map((p) => {
          const teacher = teacherMap.get(p.teacherId);
          const teacherObj = {
            _id: teacher._id,
            firebaseUid: teacher.firebaseUid,
            role: teacher.role,
            profile: teacher.profile || {},
          };

          const teacherClassKey = `${p.classroomId}_${p.teacherId}`;
          const latestReply = latestReplyByTeacherClass.get(teacherClassKey);
          const teacherChannelKey = `${String(p.channelId)}__${String(p.teacherId)}`;
          const latestAssignmentMessage = teacherChannelMetaByKey.get(teacherChannelKey)?.lastMessage || null;
          const unreadReplyCount = unreadReplyCountByTeacherClass.get(teacherClassKey) || 0;

          let virtualLastMessage = latestAssignmentMessage;
          if (latestReply && (!latestAssignmentMessage?.sentAt || new Date(latestReply.sentAt) > new Date(latestAssignmentMessage.sentAt))) {
            virtualLastMessage = {
              text: latestReply.text,
              sender: teacher._id,
              sentAt: latestReply.sentAt,
              isDeleted: false,
              type: latestReply.type,
            };
          }

          return {
            _id: `teacher-${p.classroomId}-${p.teacherId}`,
            type: "teacher_virtual",
            isTeacherChat: true,
            canMessage: false,
            classroomId: p.classroomId,
            classroomName: p.classroomName,
            subjectName: p.subjectName,
            channelId: p.channelId,
            participant: teacherObj,
            participants: [teacherObj],
            unreadCount: (teacherChannelMetaByKey.get(teacherChannelKey)?.unreadCount || 0) + unreadReplyCount,
            lastMessage: virtualLastMessage || {
              text: "No messages yet",
              sender: teacher._id,
              sentAt: null,
            },
          };
        });

      const seen = new Set();
      teacherChats = teacherChats.filter((chat) => {
        const key = `${chat.classroomId}_${chat.participant._id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    res.json({ peers, secondary, teacherChats });
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};

export const getMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { before = null, limit = null } = req.query;
    const channelExists = await getChannelById(channelId);
    if (!channelExists)
      return res.status(404).json({ message: "Channel not found" });

    if (limit !== null && limit !== undefined) {
      const page = await getMessagesPageByChannel(channelId, limit, before);
      return res.json(page);
    }

    const messages = await getMessagesByChannel(channelId);
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};

export const getClassmates = async (req, res) => {
  try {
    const { includeTeachers } = req.query; // Check for the flag
    const currentUser = await getUserByUid(req.user.uid);
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    let classmates;

    if (currentUser.role === "student" && includeTeachers === "true") {
      classmates = await getClassmatesForGroups(currentUser.profile.course, currentUser.profile.semester, currentUser._id);
    } 
    else if (currentUser.role === "student") {
      classmates = await getClassmatesForDMs(currentUser.profile.course, currentUser.profile.semester, currentUser._id);
    }
    else {
      classmates = await getClassmatesForTeacher(currentUser.profile.department, currentUser.profile.course, currentUser._id);
    }

    res.json(classmates);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getGroupDetails = async (req, res) => {
  try {
    const group = await getGroupDetailsWithPopulate(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateGroupSettings = async (req, res) => {
  try {
    const { channelId, description, deadline } = req.body;
    const user = await getUserByUid(req.user.uid);
    
    try {
        const channel = await updateChannelLastMessageAndSave(channelId, description, deadline, user._id, user._id);
        if(!channel) return res.status(404).json({ error: "Group not found" });
        
        const io = req.app.get("io");
        if (io) {
            io.to(channelId.toString()).emit("group_updated", { channelId, description, deadline: channel.deadline });
        }
        res.json(channel);
    } catch(err) {
        if(err.message === "Only admin can extend deadlines.") {
           return res.status(403).json({ message: "Only admin can extend deadlines." });
        }
        throw err;
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};


export const createChatById = async (req, res) => {
  const { targetId } = req.body;
  try {
    const currentUser = await getUserByUid(req.user.uid);
    const targetUser = await getUserById(targetId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser._id.equals(targetUser._id)) {
      return res.status(400).json({ message: "You cannot chat with yourself." });
    }

    if (currentUser.role !== targetUser.role) {
         return res.status(403).json({ message: "You can only chat with users who have the same role." });
    }

    if (currentUser.role === "student") {
        if (!currentUser.friends.includes(targetUser._id)) {
             return res.status(403).json({ message: "You must be friends to start a chat." });
        }
    }

    let channel = await getDmChannelByParticipants(currentUser._id, targetUser._id);

    if (!channel) {
      channel = await createDmChannel(currentUser._id, targetUser._id);
    }

    const fullChannel = await getPopulatedChannel(channel._id);
    res.status(200).json(fullChannel);
  } catch (error) {
    console.error("Create Chat By ID Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createChatByRegno = async (req, res) => {
  const { regno } = req.body;
  try {
    const currentUser = await getUserByUid(req.user.uid);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const targetUser = await getUserByRegno(regno);
    
    if (!targetUser) return res.status(404).json({ message: "User with this RegNo not found" });

    if (currentUser._id.equals(targetUser._id)) {
      return res.status(400).json({ message: "You cannot chat with yourself." });
    }

    if (currentUser.role !== targetUser.role) {
         return res.status(403).json({ message: "You can only chat with users who have the same role." });
    }

    if (currentUser.role === "student") {
        if (!currentUser.friends.includes(targetUser._id)) {
             return res.status(403).json({ message: "You must be friends to start a chat." });
        }
    }

    let channel = await getDmChannelByParticipants(currentUser._id, targetUser._id);

    if (!channel) {
      channel = await createDmChannel(currentUser._id, targetUser._id);
    }

    const fullChannel = await getPopulatedChannel(channel._id);
    res.status(200).json(fullChannel);
  } catch (error) {
    console.error("Create Chat Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createGroup = async (req, res) => {
  const { name, goal, deadline, regnos } = req.body;
  try {
    const currentUser = await getUserByUid(req.user.uid);
    const members = await getUsersInRegnos(regnos);
    const memberIds = members.map((u) => u._id);

    const allParticipants = [...new Set([currentUser._id, ...memberIds])];

    const newGroup = await createProjectGroupChannel(name, goal, deadline, currentUser._id, allParticipants);

    const populated = await getPopulatedChannel(newGroup._id);
    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const syncClassroomsForStudents = async (req, res) => {
  try {
    const user = await getUserByUid(req.user.uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { course, semester } = user.profile;

    if (!course || !semester) {
      return res.status(200).json({ message: "No course data to sync." });
    }

    const classmates = await User.find({
      "profile.course": course,
      "profile.semester": semester,
    });

    const allParticipantIds = classmates.map((u) => u._id);

    const classroomsToSync = [
      {
        name: `${course} - Sem ${semester} (Official)`,
        type: "classroom",
        classroomMode: "official",
        allParticipantIds
      },
      {
        name: `${course} - Sem ${semester} (Student Hub)`,
        type: "classroom",
        classroomMode: "unofficial",
        allParticipantIds
      },
    ];

    await syncClassroomsForUser(user, classroomsToSync);

    res.status(200).json({ message: "Classrooms synced." });
  } catch (error) {
    console.error("Sync Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const sendMessage = async (req, res) => {
  const { channelId, text } = req.body;

  try {
    const currentUser = await getUserByUid(req.user.uid);
    if (!currentUser)
      return res.status(404).json({ message: "User not found" });

    const newMessage = await createNewMessage(channelId, currentUser._id, text);
    await updateChannelLastMessage(channelId, text, currentUser._id);

    const populatedMessage = await getPopulatedMessage(newMessage._id);

    const io = req.app.get("io");
    if (io) {
      io.to(channelId).emit("receive_message", populatedMessage);
    }

    res.status(200).json(populatedMessage);
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json(error);
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId, type } = req.body;
    const { uid } = req.user;

    const user = await getUserByUid(uid);
    const message = await getMessageById(messageId);

    if (!message) return res.status(404).json({ error: "Message not found" });

    if (type === "everyone") {
      if (!message.sender.equals(user._id)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      message.isDeleted = true;
      message.text = "🚫 This message was deleted";
      await message.save();

      const allMessages = await getLatestMessageForChannel(message.channelId);
      
      if (allMessages.length > 0 && allMessages[0]._id.equals(message._id)) {
        await updateChannelLastMessageDeleted(message.channelId);
      }

      const io = req.app.get("io");
      if (io) {
        io.to(message.channelId.toString()).emit("message_deleted", {
          messageId: message._id,
          type: "everyone",
          channelId: message.channelId,
        });
      }
    }

    else if (type === "me") {
      const isAlreadyDeleted = message.deletedFor.some((id) =>
        id.equals(user._id)
      );

      if (!isAlreadyDeleted) {
        message.deletedFor.push(user._id);
        await message.save();
        
        const io = req.app.get("io");
        if (io) {
          io.to(`user:${user._id.toString()}`).emit("message_deleted", {
            messageId: message._id,
            type: "me",
            channelId: message.channelId,
          });
        }
      }
    }

    res.json({ success: true, messageId, type });
  } catch (err) {
    console.error("Delete Message Error:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

export const addParticipant = async (req, res) => {
  const { groupId, regno } = req.body;
  try {
    const requester = await getUserByUid(req.user.uid);
    const group = await getChannelById(groupId);

    if (group.admin.toString() !== requester._id.toString()) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    const userToAdd = await getUserByRegno(regno);
    if (!userToAdd)
      return res.status(404).json({ message: "Student not found" });

    if (!group.participants.includes(userToAdd._id)) {
      group.participants.push(userToAdd._id);
      await group.save();
    }

    const populated = await getPopulatedChannel(groupId);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const removeParticipant = async (req, res) => {
  const { groupId, userId } = req.body;
  try {
    const requester = await getUserByUid(req.user.uid);
    const group = await getChannelById(groupId); // get channel

    const isAdmin = group.admin.toString() === requester._id.toString();
    const isSelf = requester._id.toString() === userId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const result = await removeParticipantFromChannel(groupId, userId);
    if (result && result.deleted) {
      return res.json({ message: "Group deleted", deleted: true });
    }

    const populated = await getPopulatedChannel(groupId);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const setAdmin = async (req, res) => {
  const { groupId, userId } = req.body;
  try {
    const requester = await getUserByUid(req.user.uid);
    const group = await getChannelById(groupId);

    if (group.admin.toString() !== requester._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only admin can transfer ownership" });
    }

    group.admin = userId;
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const requester = await getUserByUid(req.user.uid);
    const group = await getChannelById(req.params.groupId);

    if (group.admin.toString() !== requester._id.toString()) {
      return res.status(403).json({ message: "Only admin can delete group" });
    }

    await deleteChannelById(req.params.groupId);
    res.json({ message: "Group deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const markMessagesRead = async (req, res) => {
    const { channelId } = req.body;
    try {
        const user = await getUserByUid(req.user.uid);
        if (!user) return res.status(404).json({ message: "User not found" });

        const channel = await getChannelById(channelId);
        if (channel) {
            const existing = channel.readStatus.find(s => s.user.equals(user._id));
            if (existing) {
                existing.lastReadAt = new Date();
            } else {
                channel.readStatus.push({ user: user._id, lastReadAt: new Date() });
            }
            await channel.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Mark Read Error:", error);
        res.status(500).json({ error: "Server error" });
    }
};
