import path from "path";
import {
  isCloudinaryConfigured,
  MAX_ATTACHMENT_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  OFFICE_MIME_TYPES,
  SAFE_PREFIXES,
  generateOfficePreviewPdf,
  sanitizeFileName,
  uploadBufferToCloudinary,
  getResourceTypeForMime,
  resolveCloudinaryResource,
  buildCloudinarySignedDownloadUrl,
  buildUrls,
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
    await uploadBufferToCloudinary(objectPath, buffer, fileType, originalResourceType);
    const original = buildUrls(req, objectPath, safeName);

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
        await uploadBufferToCloudinary(previewObjectPath, previewResult.buffer, "application/pdf", "raw");
        const previewUrls = buildUrls(req, previewObjectPath, pdfName);
        previewPath = previewObjectPath;
        previewUrl = previewUrls.url;
        previewDownloadUrl = previewUrls.downloadUrl;
        previewType = "application/pdf";
        previewStatus = "ready";
      } else {
        previewStatus = "unavailable";
        previewError = previewResult.error || "Preview conversion failed.";
        console.warn("Office->PDF preview conversion skipped:", previewError);
      }
    } else if (fileType === "application/pdf") {
      previewPath = objectPath;
      previewUrl = original.url;
      previewDownloadUrl = original.downloadUrl;
      previewType = fileType;
      previewStatus = "ready";
    } else if (fileType.startsWith("image/")) {
      previewStatus = "ready";
    } else {
      previewStatus = "unavailable";
    }

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
        path: objectPath,
        classroomId,
        subjectId,
        assignmentId,
      },
    });

    return res.status(201).json({
      name: safeName,
      type: fileType,
      size: buffer.length,
      kind: fileType.startsWith("image/") ? "image" : "file",
      scope,
      url: original.url,
      downloadUrl: original.downloadUrl,
      path: objectPath,
      previewUrl,
      previewDownloadUrl,
      previewPath,
      previewType,
      previewStatus,
      previewError,
    });
  } catch (error) {
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
    console.error("POST /api/uploads/chat-attachment failed:", error);
    return res.status(500).json({ error: "Server error while uploading file" });
  }
};

export const downloadFile = async (req, res) => {
  try {
    if (!isCloudinaryConfigured) {
      return res.status(500).json({ error: "Cloudinary is not configured on server" });
    }

    const encodedPath = req.params.encodedPath;
    const objectPath = decodeURIComponent(encodedPath || "");
    if (!objectPath || !SAFE_PREFIXES.some((prefix) => objectPath.startsWith(prefix))) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    const resource = await resolveCloudinaryResource(objectPath);
    if (!resource?.secure_url) {
      return res.status(404).json({ error: "File not found" });
    }

    const signedDownloadUrl = buildCloudinarySignedDownloadUrl(objectPath, resource.resource_type || "raw");
    const response = await fetch(signedDownloadUrl);
    if (!response.ok) {
      return res.status(404).json({ error: "File not found" });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const shouldDownload = String(req.query.download || "0") === "1";
    const fileNameFromPath = path.basename(objectPath);
    const requestedName = String(req.query.name || fileNameFromPath).replace(/[\r\n"]/g, "_");

    res.setHeader("Content-Type", resource.content_type || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=300");
    if (shouldDownload) {
      res.setHeader("Content-Disposition", `attachment; filename="${requestedName}"`);
    } else {
      res.setHeader("Content-Disposition", `inline; filename="${requestedName}"`);
    }
    return res.send(buffer);
  } catch (error) {
    console.error("GET /api/uploads/file/:encodedPath failed:", error);
    return res.status(500).json({ error: "Server error while loading file" });
  }
};
