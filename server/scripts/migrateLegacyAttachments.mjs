import "dotenv/config";
import mongoose from "mongoose";
import {
  ALLOWED_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  OFFICE_MIME_TYPES,
  generateOfficePreviewPdf,
  sanitizeFileName,
  uploadBufferToCloudinary,
  buildObjectPath,
  getResourceTypeForMime,
  isCloudinaryConfigured,
} from "../services/uploads.service.js";

import Submission from "../models/Submission.js";
import Message from "../models/Message.js";
import Announcement from "../models/Announcement.js";
import Classroom from "../models/Classroom.js";
import UniversityAnnouncement from "../models/UniversityAnnouncement.js";

const APPLY_CHANGES = process.argv.includes("--apply");
if (!isCloudinaryConfigured) {
  console.error("Cloudinary is not configured. Aborting.");
  process.exit(1);
}

const MIME_TO_EXT = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/zip": "zip",
  "text/plain": "txt",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

const normalizeMime = (value) =>
  String(value || "")
    .toLowerCase()
    .split(";")[0]
    .trim();

const resolveSafeName = (fileName, mime) => {
  const normalizedMime = normalizeMime(mime);
  const mappedExt = MIME_TO_EXT[normalizedMime] || "";
  const rawName = String(fileName || "attachment").trim();
  const hasExt = /\.[a-z0-9]{1,10}$/i.test(rawName);

  if (!hasExt && mappedExt) {
    return sanitizeFileName(`${rawName}.${mappedExt}`);
  }

  if (hasExt) {
    const ext = rawName.split(".").pop()?.toLowerCase() || "";
    if (ext === "bin" && mappedExt) {
      return sanitizeFileName(rawName.replace(/\.bin$/i, `.${mappedExt}`));
    }
    return sanitizeFileName(rawName);
  }

  return sanitizeFileName(rawName);
};

const parseDataUrl = (dataUrl) => {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2];
  return { mime, base64 };
};

const buildAttachmentFromDataUrl = async ({
  dataUrl,
  fileName,
  scope,
  userId,
  classroomId,
  subjectId,
  assignmentId,
}) => {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  const { mime, base64 } = parsed;
  const normalizedMime = normalizeMime(mime);

  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    throw new Error(`Unsupported mime type: ${normalizedMime || mime}`);
  }

  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) throw new Error("Empty dataUrl buffer");
  if (buffer.length > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(`File too large (${buffer.length} bytes)`);
  }

  const safeName = resolveSafeName(fileName || `attachment-${Date.now()}`, normalizedMime);
  const objectPath = buildObjectPath({
    scope,
    safeName,
    userId: String(userId || "unknown"),
    classroomId,
    subjectId,
    assignmentId,
  });

  const originalUpload = await uploadBufferToCloudinary(
    objectPath,
    buffer,
    normalizedMime,
    getResourceTypeForMime(normalizedMime)
  );
  const originalSecureUrl = originalUpload?.secure_url || "";
  const originalPublicId = originalUpload?.public_id || objectPath;
  const originalVersion = Number(originalUpload?.version || 0) || null;
  const originalResourceType = originalUpload?.resource_type || getResourceTypeForMime(normalizedMime);
  const originalFormat = originalUpload?.format || safeName.split(".").pop() || "";

  let previewPath = null;
  let previewUrl = null;
  let previewDownloadUrl = null;
  let previewType = null;
  let previewStatus = "none";
  let previewError = null;

  if (OFFICE_MIME_TYPES.has(normalizedMime)) {
    previewStatus = "processing";
    const previewResult = await generateOfficePreviewPdf(buffer);
    if (previewResult.ok && previewResult.buffer?.length) {
      const pdfName = `${safeName.replace(/\.[^.]+$/, "")}.pdf`;
      const previewObjectPath = objectPath.replace(/[^/]+$/, `${Date.now()}-preview-${pdfName}`);
      const previewUpload = await uploadBufferToCloudinary(
        previewObjectPath,
        previewResult.buffer,
        "application/pdf",
        "raw"
      );
      previewPath = previewObjectPath;
      previewUrl = previewUpload?.secure_url || "";
      previewDownloadUrl = previewUrl || "";
      previewType = "application/pdf";
      previewStatus = "ready";
    } else {
      previewStatus = "unavailable";
      previewError = previewResult.error || "Preview conversion failed.";
    }
  } else if (mime === "application/pdf") {
    previewPath = objectPath;
    previewUrl = originalSecureUrl;
    previewDownloadUrl = originalSecureUrl;
    previewType = normalizedMime;
    previewStatus = "ready";
  } else if (normalizedMime.startsWith("image/")) {
    previewUrl = originalSecureUrl;
    previewDownloadUrl = originalSecureUrl;
    previewType = normalizedMime;
    previewStatus = "ready";
  } else {
    previewStatus = "unavailable";
  }

  return {
    type: "file",
    name: safeName,
    mimeType: normalizedMime,
    size: buffer.length,
    kind: mime.startsWith("image/") ? "image" : "file",
    scope,
    url: originalSecureUrl,
    downloadUrl: originalSecureUrl,
    path: objectPath,
    cloudinary: {
      publicId: originalPublicId,
      version: originalVersion,
      resourceType: originalResourceType,
      format: originalFormat,
      secureUrl: originalSecureUrl,
    },
    publicId: originalPublicId,
    version: originalVersion,
    resourceType: originalResourceType,
    format: originalFormat,
    secureUrl: originalSecureUrl,
    previewUrl,
    previewDownloadUrl,
    previewPath,
    previewType,
    previewStatus,
    previewError,
  };
};

const isDataUrlString = (value) => typeof value === "string" && value.startsWith("data:");

const migrateAttachmentObject = async ({
  attachment,
  scope,
  userId,
  classroomId,
  subjectId,
  assignmentId,
  defaultName,
}) => {
  if (!attachment || typeof attachment !== "object") return null;
  if (!isDataUrlString(attachment.url)) return null;

  const next = await buildAttachmentFromDataUrl({
    dataUrl: attachment.url,
    fileName: attachment.name || defaultName,
    scope,
    userId,
    classroomId,
    subjectId,
    assignmentId,
  });
  return next;
};

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`[migrate] Connected. Apply: ${APPLY_CHANGES}`);

  const stats = {
    submissions: 0,
    messages: 0,
    announcements: 0,
    classrooms: 0,
    university: 0,
    errors: 0,
  };

  // Submissions (assignment uploads)
  for await (const sub of Submission.find({ file: { $type: "string", $regex: /^data:/ } }).cursor()) {
    try {
      const attachment = await buildAttachmentFromDataUrl({
        dataUrl: sub.file,
        fileName: `submission-${sub._id}.bin`,
        scope: "assignment_submission",
        userId: sub.studentId,
        assignmentId: sub.assignmentId,
      });
      if (!attachment) continue;
      stats.submissions += 1;
      if (APPLY_CHANGES) {
        sub.file = attachment;
        await sub.save();
      }
    } catch (err) {
      stats.errors += 1;
      console.error(`[migrate] submission ${sub._id} failed:`, err.message || err);
    }
  }

  // Messages (chat attachments)
  for await (const msg of Message.find({ "noteData.url": { $type: "string", $regex: /^data:/ } }).cursor()) {
    try {
      const next = await migrateAttachmentObject({
        attachment: msg.noteData,
        scope: "dm",
        userId: msg.sender,
        defaultName: msg.noteData?.name || `message-${msg._id}.bin`,
      });
      if (!next) continue;
      stats.messages += 1;
      if (APPLY_CHANGES) {
        msg.noteData = { ...msg.noteData, ...next };
        await msg.save();
      }
    } catch (err) {
      stats.errors += 1;
      console.error(`[migrate] message ${msg._id} failed:`, err.message || err);
    }
  }

  // Announcements (classroom announcements)
  for await (const ann of Announcement.find({ "noteData.url": { $type: "string", $regex: /^data:/ } }).cursor()) {
    try {
      const next = await migrateAttachmentObject({
        attachment: ann.noteData,
        scope: "community_official",
        userId: ann.teacherId,
        classroomId: ann.classroomId,
        defaultName: ann.noteData?.name || `announcement-${ann._id}.bin`,
      });
      if (!next) continue;
      stats.announcements += 1;
      if (APPLY_CHANGES) {
        ann.noteData = { ...ann.noteData, ...next };
        await ann.save();
      }
    } catch (err) {
      stats.errors += 1;
      console.error(`[migrate] announcement ${ann._id} failed:`, err.message || err);
    }
  }

  // Classroom study materials
  for await (const cls of Classroom.find({ "subjects.uploads.url": { $type: "string", $regex: /^data:/ } }).cursor()) {
    try {
      let changed = false;
      const updatedSubjects = (cls.subjects || []).map((sub) => {
        const uploads = (sub.uploads || []).map((u) => {
          if (!u?.url || !isDataUrlString(u.url)) return u;
          return { ...u, __migrate__: true };
        });
        return { ...sub, uploads };
      });

      for (const subject of updatedSubjects) {
        for (let i = 0; i < (subject.uploads || []).length; i += 1) {
          const upload = subject.uploads[i];
          if (!upload?.__migrate__) continue;
          try {
            const next = await migrateAttachmentObject({
              attachment: upload,
              scope: "study_material",
              userId: cls._id,
              classroomId: cls._id,
              subjectId: subject._id,
              defaultName: upload.name || `study-${cls._id}-${subject._id}-${i}.bin`,
            });
            if (next) {
              subject.uploads[i] = { ...upload, ...next };
              delete subject.uploads[i].__migrate__;
              changed = true;
              stats.classrooms += 1;
            }
          } catch (err) {
            stats.errors += 1;
            console.error(`[migrate] classroom ${cls._id} upload failed:`, err.message || err);
          }
        }
      }

      if (APPLY_CHANGES && changed) {
        cls.subjects = updatedSubjects;
        await cls.save();
      }
    } catch (err) {
      stats.errors += 1;
      console.error(`[migrate] classroom ${cls._id} failed:`, err.message || err);
    }
  }

  // University announcements
  for await (const uni of UniversityAnnouncement.find({ "attachment.url": { $type: "string", $regex: /^data:/ } }).cursor()) {
    try {
      const next = await migrateAttachmentObject({
        attachment: uni.attachment,
        scope: "university_announcement",
        userId: uni.createdBy?.userId,
        defaultName: uni.attachment?.name || `university-${uni._id}.bin`,
      });
      if (!next) continue;
      stats.university += 1;
      if (APPLY_CHANGES) {
        uni.attachment = { ...uni.attachment, ...next };
        await uni.save();
      }
    } catch (err) {
      stats.errors += 1;
      console.error(`[migrate] university ${uni._id} failed:`, err.message || err);
    }
  }

  console.log("[migrate] Done.", stats);
  await mongoose.disconnect();
};

migrate().catch((err) => {
  console.error("[migrate] Fatal:", err);
  process.exit(1);
});
