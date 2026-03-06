import {
    getUserNotifications,
    getUserByUid,
    saveUser
} from "../services/notifications.service.js";

export const getNotifications = async (req, res) => {
  try {
    const user = await getUserNotifications(req.user.uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    const sortedNotifications = (user.notifications || []).sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    res.json(sortedNotifications);
  } catch (error) {
    console.error("Fetch Notifications Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const markNotificationsRead = async (req, res) => {
    try {
        const { notificationId, notificationType, classroomId, teacherId } = req.body || {};
        const user = await getUserByUid(req.user.uid);

        if (!user) return res.status(404).json({ message: "User not found" });

        if (notificationId) {
            user.notifications = user.notifications.map(n => {
                if (n.id === notificationId || n._id === notificationId) {
                    return { ...n, read: true };
                }
                return n;
            });
        } else if (notificationType && classroomId && teacherId) {
            const scopeType = String(notificationType);
            const scopeClassroomId = String(classroomId);
            const scopeTeacherId = String(teacherId);

            user.notifications = (user.notifications || []).map((n) => {
                const matches =
                    String(n.type || "") === scopeType &&
                    String(n.classroomId || "") === scopeClassroomId &&
                    String(n.teacherId || "") === scopeTeacherId;
                return matches ? { ...n, read: true } : n;
            });
        } else {
            user.notifications = user.notifications.map(n => ({ ...n, read: true }));
        }

        user.markModified("notifications");
        await saveUser(user);

        res.json({ message: "Notifications updated" });
    } catch (error) {
        console.error("Mark Read Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteAllNotifications = async (req, res) => {
    try {
        const user = await getUserByUid(req.user.uid);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.notifications = [];
        user.markModified("notifications");
        await saveUser(user);

        res.json({ message: "All notifications deleted" });
    } catch (error) {
        console.error("Delete All Notifications Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const notificationId = req.params.id;
        const user = await getUserByUid(req.user.uid);

        if (!user) return res.status(404).json({ message: "User not found" });

        const initialLength = user.notifications.length;
        user.notifications = user.notifications.filter(n => n.id !== notificationId && n._id !== notificationId);

        if (user.notifications.length === initialLength) {
             return res.status(404).json({ message: "Notification not found" });
        }

        user.markModified("notifications");
        await saveUser(user);

        res.json({ message: "Notification deleted" });
    } catch (error) {
        console.error("Delete Notification Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
