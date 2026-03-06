import {
  getUserByUid,
  getUserById,
  getUserByRegno,
  getUsersByIds,
  getUserByIdentifier,
  saveUser,
  saveUsers,
  getMyFriendStatus
} from "../services/friends.service.js";

export const searchUser = async (req, res) => {
  const { regno } = req.body;
  const { uid } = req.user;

  try {
    const requester = await getUserByUid(uid);
    if (!requester) return res.status(404).json({ message: "User not found" });

    const target = await getUserByRegno(regno);

    if (!target) {
        return res.status(404).json({ message: "Student not found with this RegNo." });
    }

    if (requester.role !== target.role) {
         return res.status(403).json({ message: `You can only search for other ${requester.role}s.` });
    }

    if (target._id.equals(requester._id)) {
        return res.status(400).json({ message: "You cannot search for yourself." });
    }

    res.json({
        _id: target._id,
        profile: target.profile,
        role: target.role,
        isFriend: requester.friends.includes(target._id),
        isSent: requester.friendRequests.sent.some(id => id.equals(target._id)),
        isReceived: requester.friendRequests.received.some(id => id.equals(target._id))
    });

  } catch (error) {
    console.error("Search User Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const sendFriendRequest = async (req, res) => {
  const { targetUserId } = req.body;
  const { uid } = req.user;

  try {
    const sender = await getUserByUid(uid);
    const target = await getUserById(targetUserId);

    if (!sender || !target) {
      return res.status(404).json({ message: "User not found" });
    }

    if (sender.role !== "student" || target.role !== "student") {
      return res.status(403).json({ message: "Friend system is for students only." });
    }

    if (sender.friends.includes(target._id)) {
      return res.status(400).json({ message: "You are already friends." });
    }

    const isSent = sender.friendRequests.sent.some(id => id.equals(target._id));
    const isReceived = sender.friendRequests.received.some(id => id.equals(target._id));

    if (isSent) {
        return res.status(400).json({ message: "Request already sent." });
    }
    
    if (isReceived) {
        return res.status(400).json({ message: "They already sent you a request. Please accept it." });
    }

    sender.friendRequests.sent.push(target._id);
    target.friendRequests.received.push(sender._id);
    
    await saveUsers(sender, target);

    const io = req.app.get("io");
    if (io) {
      const roomName = `user:${target._id.toString()}`;
      io.to(roomName).emit("event", {
        type: "FRIEND_REQUEST_RECEIVED",
        payload: {
          requestId: sender._id,
          senderName: sender.profile.name,
          sender: {
            _id: sender._id,
            profile: sender.profile,
            firebaseUid: sender.firebaseUid,
            role: sender.role
          }
        },
        timestamp: Date.now(),
        senderId: sender._id
      });
    }

    res.status(200).json({ message: "Friend request sent", targetId: target._id });
  } catch (error) {
    console.error("Friend Request Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  const { requesterId } = req.body;
  const { uid } = req.user;

  try {
    const receiver = await getUserByUid(uid);
    const sender = await getUserById(requesterId);

    if (!receiver || !sender) {
      return res.status(404).json({ message: "User not found" });
    }

     if (receiver.role !== "student" || sender.role !== "student") {
      return res.status(403).json({ message: "Friend system is for students only." });
    }

    const hasRequest = receiver.friendRequests.received.some(id => id.equals(sender._id));
    if (!hasRequest) {
      return res.status(400).json({ message: "No request found from this user." });
    }

    receiver.friendRequests.received = receiver.friendRequests.received.filter(
      (id) => !id.equals(sender._id)
    );
    sender.friendRequests.sent = sender.friendRequests.sent.filter(
      (id) => !id.equals(receiver._id)
    );

    if (!receiver.friends.includes(sender._id)) receiver.friends.push(sender._id);
    if (!sender.friends.includes(receiver._id)) sender.friends.push(receiver._id);

    await saveUsers(receiver, sender);

    const io = req.app.get("io");
    if (io) {
      const roomName = `user:${sender._id.toString()}`;
      io.to(roomName).emit("event", {
        type: "FRIEND_REQUEST_ACCEPTED",
        payload: {
           accepterId: receiver._id,
           accepterName: receiver.profile.name,
           accepter: {
             _id: receiver._id,
             profile: receiver.profile
           }
        },
        timestamp: Date.now(),
        senderId: receiver._id
      });
    }

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Accept Friend Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const declineFriendRequest = async (req, res) => {
  const { requesterId } = req.body;
  const { uid } = req.user;

  try {
    const receiver = await getUserByUid(uid);
    const sender = await getUserById(requesterId);

    if (!receiver || !sender) {
      return res.status(404).json({ message: "User not found" });
    }
    
     if (receiver.role !== "student" || sender.role !== "student") {
      return res.status(403).json({ message: "Friend system is for students only." });
    }

    receiver.friendRequests.received = receiver.friendRequests.received.filter(
      (id) => !id.equals(sender._id)
    );
    sender.friendRequests.sent = sender.friendRequests.sent.filter(
      (id) => !id.equals(receiver._id)
    );

    await saveUsers(receiver, sender);

    const io = req.app.get("io");
    if (io) {
         const roomName = `user:${sender._id.toString()}`;
         io.to(roomName).emit("event", {
             type: "FRIEND_REQUEST_DECLINED",
             payload: {
                 declinerId: receiver._id
             },
             timestamp: Date.now(),
             senderId: receiver._id
         });
    }

    res.status(200).json({ message: "Friend request declined" });
  } catch (error) {
    console.error("Decline Friend Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeFriend = async (req, res) => {
  const { targetId } = req.body;
  const { uid } = req.user;

  try {
    const user = await getUserByUid(uid);
    const target = await getUserById(targetId);

    if (!user || !target) {
      return res.status(404).json({ message: "User not found" });
    }

    user.friends = user.friends.filter((id) => !id.equals(target._id));
    target.friends = target.friends.filter((id) => !id.equals(user._id));

    await saveUsers(user, target);

    const io = req.app.get("io");
    if (io) {
        const targetRoom = `user:${target._id.toString()}`;
        io.to(targetRoom).emit("event", {
            type: "FRIEND_REMOVED",
            payload: {
                removerId: user._id,
                removerName: user.profile.name
            },
            timestamp: Date.now(),
            senderId: user._id
        });
    }

    res.status(200).json({ message: "Friend removed successfully" });
  } catch (error) {
    console.error("Remove Friend Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getFriendStatus = async (req, res) => {
     try {
        const user = await getMyFriendStatus(req.user.uid);
        res.json(user);
     } catch (err) {
         res.status(500).json(err);
     }
};

export const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;

        let user = await getUserByIdentifier(id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json({
            _id: user._id,
            role: user.role,
            email: user.email, 
            regno: user.regno || user.profile?.regno || "",
            profile: {
                name: user.profile.name,
                displayName: user.profile.displayName || user.profile.name,
                avatar: user.profile.avatar,
                about: user.profile.about || "",
                bannerColor: user.profile.bannerColor || "blue",
                course: user.profile.course,
                department: user.profile.department,
                semester: user.profile.semester,
                shift: user.profile.shift
            }
        });

    } catch (error) {
        console.error("Fetch Profile Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getMultipleUsers = async (req, res) => {
    try {
        const { userIds } = req.body; 
        const { uid } = req.user;

        if (!userIds || !Array.isArray(userIds)) {
            return res.status(400).json({ message: "Invalid user IDs" });
        }

        const requester = await getUserByUid(uid);
        if (!requester) return res.status(404).json({ message: "User not found" });

        const users = await getUsersByIds(userIds);

        const profiles = users.map(user => ({
            _id: user._id,
            profile: user.profile,
            role: user.role,
            isFriend: requester.friends.includes(user._id),
            isSent: requester.friendRequests.sent.some(id => id.equals(user._id)),
            isReceived: requester.friendRequests.received.some(id => id.equals(user._id))
        }));

        res.json(profiles);

    } catch (error) {
        console.error("Get Users Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
