import {
  getUserByFirebaseUid,
  createUniversityAnnouncement,
  listUniversityAnnouncements,
} from "../services/university.service.js";
import { createLogFromRequest } from "../services/logs.service.js";

export const postUniversityAnnouncement = async (req, res) => {
  try {
    const { message = "", attachment = null, isPinned = false } = req.body || {};
    const trimmedMessage = String(message || "").trim();

    if (!trimmedMessage && !attachment) {
      return res.status(400).json({ error: "message or attachment is required" });
    }

    const me = await getUserByFirebaseUid(req.user.uid);
    if (!me) {
      return res.status(404).json({ error: "User not found" });
    }
    if (me.role !== "admin") {
      return res.status(403).json({ error: "Only admins can create university announcements" });
    }

    const normalizedAttachment = attachment
      ? {
          type: "file",
          name: String(attachment.name || "").trim(),
          mimeType: String(attachment.mimeType || attachment.type || "").trim(),
          cloudinary: attachment.cloudinary
            ? {
                publicId: String(attachment.cloudinary.publicId || "").trim(),
                version: Number(attachment.cloudinary.version || 0) || null,
                resourceType: String(attachment.cloudinary.resourceType || "").trim(),
                format: String(attachment.cloudinary.format || "").trim(),
                secureUrl: String(attachment.cloudinary.secureUrl || "").trim(),
              }
            : null,
          previewUrl: String(attachment.previewUrl || "").trim(),
          previewDownloadUrl: String(attachment.previewDownloadUrl || "").trim(),
          previewPath: String(attachment.previewPath || "").trim(),
          previewType: String(attachment.previewType || "").trim(),
          previewStatus: String(attachment.previewStatus || "").trim(),
          previewError: String(attachment.previewError || "").trim(),
          size: Number(attachment.size || 0),
          kind: attachment.kind === "image" ? "image" : "file",
        }
      : null;
    if (normalizedAttachment && (!normalizedAttachment.cloudinary?.publicId || !normalizedAttachment.cloudinary?.secureUrl)) {
      return res.status(400).json({ error: "attachment.cloudinary with publicId and secureUrl is required" });
    }

    const created = await createUniversityAnnouncement({
      kind: "announcement",
      message: trimmedMessage,
      attachment: normalizedAttachment,
      createdBy: {
        userId: me._id,
        name: me.profile?.name || me.profile?.displayName || "Admin",
        role: me.role,
        avatar: me.profile?.avatar ?? null,
      },
      isPinned: Boolean(isPinned),
      isActive: true,
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("university_announcement_new", created);
    }

    await createLogFromRequest(req, {
      eventType: "UNIVERSITY_ANNOUNCEMENT_POSTED",
      category: "university",
      action: "post_announcement",
      status: "success",
      message: "University announcement posted",
      target: { type: "university_announcement", id: String(created._id) },
      metadata: {
        hasAttachment: !!normalizedAttachment,
        attachmentType: normalizedAttachment?.mimeType || normalizedAttachment?.type || "",
        attachmentKind: normalizedAttachment?.kind || "",
        attachmentPath: normalizedAttachment?.cloudinary?.publicId || "",
        messageLength: trimmedMessage.length,
      },
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error("POST /api/university/announcements failed:", error);
    return res.status(500).json({ error: "Failed to create university announcement" });
  }
};

export const getRecentUniversityAnnouncements = async (req, res) => {
  try {
    const rawLimit = Number(req.query.limit || 8);
    const safeLimit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 25) : 8;
    const data = await listUniversityAnnouncements(safeLimit);
    return res.json(data);
  } catch (error) {
    console.error("GET /api/university/announcements/recent failed:", error);
    return res.status(500).json({ error: "Failed to fetch university announcements" });
  }
};
