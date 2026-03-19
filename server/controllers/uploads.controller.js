import path from "path";
import {
  isCloudinaryConfigured,
  MAX_ATTACHMENT_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  OFFICE_MIME_TYPES,
  generateOfficePreviewPdf,
  sanitizeFileName,
  uploadBufferToCloudinary,
  getResourceTypeForMime,
  buildObjectPath,
} from "../services/uploads.service.js";
import { createLogFromRequest } from "../services/logs.service.js";

export const uploadAttachment = async (req, res) => {
  try {
    if (!isCloudinaryConfigured) {
      return res.status(500).json({ error: "Cloudinary is not configured on server" });
    }

    const {
      fileName,
      fileType,
      fileSize,
      dataUrl,
      scope = "dm",
      classroomId = null,
      subjectId = null,
      assignmentId = null,
    } = req.body || {};
    if (!fileName || !fileType || !dataUrl) {
      return res.status(400).json({ error: "fileName, fileType and dataUrl are required" });
    }

    if (!ALLOWED_MIME_TYPES.has(fileType)) {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    const sizeNum = Number(fileSize || 0);
    if (Number.isNaN(sizeNum) || sizeNum <= 0) {
      return res.status(400).json({ error: "Invalid file size" });
    }
    if (sizeNum > MAX_ATTACHMENT_SIZE_BYTES) {
      return res.status(400).json({ error: `File too large. Max ${Math.floor(MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024))}MB` });
    }

    const parsed = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (!parsed) {
      return res.status(400).json({ error: "Invalid dataUrl format" });
    }
    const dataUrlType = parsed[1];
    if (dataUrlType !== fileType) {
      return res.status(400).json({ error: "File type mismatch" });
    }

    const base64Payload = parsed[2];
    const buffer = Buffer.from(base64Payload, "base64");
    if (!buffer.length) {
      return res.status(400).json({ error: "Empty file content" });
    }
    if (buffer.length > MAX_ATTACHMENT_SIZE_BYTES) {
      return res.status(400).json({ error: `File too large. Max ${Math.floor(MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024))}MB` });
    }

    const safeName = sanitizeFileName(fileName);
    const objectPath = buildObjectPath({
      scope,
      safeName,
      userId: String(req.user.uid || "unknown"),
      classroomId,
      subjectId,
      assignmentId,
    });

    const originalResourceType = getResourceTypeForMime(fileType);
    let originalUpload;
    try {
      originalUpload = await uploadBufferToCloudinary(objectPath, buffer, fileType, originalResourceType);
    } catch (error) {
      console.error("Cloudinary upload failed (original):", {
        message: error?.message || "Unknown upload error",
        path: objectPath,
        type: fileType,
        scope,
      });
      return res.status(500).json({ error: "Upload failed while storing original file" });
    }
    const originalSecureUrl = originalUpload?.secure_url || "";
    const originalPublicId = originalUpload?.public_id || objectPath;
    const originalVersion = Number(originalUpload?.version || 0) || null;
    const originalResourceTypeResolved = originalUpload?.resource_type || originalResourceType;
    const originalFormat = originalUpload?.format || path.extname(safeName).replace(".", "") || null;
    const cloudinaryMeta = {
      publicId: originalPublicId,
      version: originalVersion,
      resourceType: originalResourceTypeResolved,
      format: originalFormat,
      secureUrl: originalSecureUrl,
    };

    let previewPath = null;
    let previewUrl = null;
    let previewDownloadUrl = null;
    let previewType = null;
    let previewStatus = "none";
    let previewError = null;

    if (OFFICE_MIME_TYPES.has(fileType)) {
      previewStatus = "processing";
      const previewResult = await generateOfficePreviewPdf(buffer);
      if (previewResult.ok && previewResult.buffer?.length) {
        const pdfName = `${path.basename(safeName, path.extname(safeName))}.pdf`;
        const previewObjectPath = objectPath.replace(/[^/]+$/, `${Date.now()}-preview-${pdfName}`);
        try {
          const previewUpload = await uploadBufferToCloudinary(
            previewObjectPath,
            previewResult.buffer,
            "application/pdf",
            "raw"
          );
          previewUrl = previewUpload?.secure_url || "";
        } catch (error) {
          console.error("Cloudinary upload failed (preview):", {
            message: error?.message || "Unknown preview upload error",
            path: previewObjectPath,
            type: "application/pdf",
            scope,
          });
          return res.status(500).json({ error: "Upload failed while storing preview file" });
        }
        previewPath = previewObjectPath;
        previewDownloadUrl = previewUrl || null;
        previewType = "application/pdf";
        previewStatus = "ready";
      } else {
        previewStatus = "unavailable";
        previewError = previewResult.error || "Preview conversion failed.";
        console.warn("Office->PDF preview conversion skipped:", previewError);
      }
    } else if (fileType === "application/pdf") {
      previewPath = objectPath;
      previewUrl = originalSecureUrl;
      previewDownloadUrl = originalSecureUrl;
      previewType = fileType;
      previewStatus = "ready";
    } else if (fileType.startsWith("image/")) {
      previewPath = objectPath;
      previewUrl = originalSecureUrl;
      previewDownloadUrl = originalSecureUrl;
      previewType = fileType;
      previewStatus = "ready";
    } else {
      previewStatus = "unavailable";
    }

    try {
      await createLogFromRequest(req, {
        eventType: "MEDIA_UPLOAD",
        category: "media",
        action: "upload_attachment",
        status: "success",
        message: "Attachment uploaded",
      metadata: {
        scope,
        fileName: safeName,
        fileType,
        kind: fileType.startsWith("image/") ? "image" : "file",
        size: buffer.length,
        publicId: originalPublicId,
        classroomId,
        subjectId,
        assignmentId,
      },
      });
    } catch (logError) {
      console.error("Upload success log failed:", logError?.message || logError);
    }

    return res.status(201).json({
      type: "file",
      name: safeName,
      mimeType: fileType,
      size: buffer.length,
      kind: fileType.startsWith("image/") ? "image" : "file",
      scope,
      cloudinary: cloudinaryMeta,
      previewUrl,
      previewDownloadUrl,
      previewPath,
      previewType,
      previewStatus,
      previewError,
    });
  } catch (error) {
    try {
      await createLogFromRequest(req, {
      eventType: "MEDIA_UPLOAD",
      category: "media",
      action: "upload_attachment",
      status: "failure",
      message: "Attachment upload failed",
      metadata: {
        scope: req.body?.scope || "unknown",
        fileName: req.body?.fileName || "",
        fileType: req.body?.fileType || "",
      },
    });
    } catch (logError) {
      console.error("Upload failure log failed:", logError?.message || logError);
    }
    console.error("POST /api/uploads/chat-attachment failed:", {
      message: error?.message || "Unknown server error",
      stack: error?.stack,
      scope: req.body?.scope || "unknown",
      fileName: req.body?.fileName || "",
      fileType: req.body?.fileType || "",
    });
    return res.status(500).json({ error: "Server error while uploading file" });
  }
};

export const downloadFile = async (req, res) => {
  res.status(410).json({
    error: "Deprecated endpoint. Use Cloudinary secure_url returned at upload time.",
  });
};
