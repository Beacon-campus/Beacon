import crypto from "crypto";
import path from "path";
import { spawnSync } from "child_process";
import { v2 as cloudinary } from "cloudinary";
import libre from "libreoffice-convert";
import { promisify } from "util";

export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

export const MAX_ATTACHMENT_SIZE_BYTES = Number(process.env.MAX_ATTACHMENT_SIZE_BYTES || 2 * 1024 * 1024);

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export const OFFICE_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const SAFE_PREFIXES = ["chat/", "groups/", "community/", "calendar/", "assignments/", "study-materials/", "university/"];

const SCOPE_TO_PREFIX = {
  dm: "chat/dm",
  group: "groups/messages",
  community_official: "community/official",
  community_hub: "community/hub",
  study_material: "study-materials",
  assignment_submission: "assignments/submissions",
  assignment_resource: "assignments/resources",
  university_announcement: "university/announcements",
};

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const isCloudinaryConfigured = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

export const convertToPdf = promisify(libre.convert);

let officeRuntimeCache = null;

export function getOfficeRuntimeStatus() {
  if (officeRuntimeCache) return officeRuntimeCache;

  const commands = [];
  if (process.env.LIBREOFFICE_PATH) commands.push(String(process.env.LIBREOFFICE_PATH).replace(/^"(.*)"$/, "$1"));
  commands.push("soffice", "libreoffice");

  for (const command of commands) {
    try {
      const probe = spawnSync(command, ["--version"], {
        encoding: "utf8",
        shell: false,
        timeout: 5000,
      });
      if (!probe.error && probe.status === 0) {
        officeRuntimeCache = { available: true, command };
        return officeRuntimeCache;
      }
    } catch {
      // continue probing
    }
  }

  officeRuntimeCache = {
    available: false,
    command: null,
    reason: "LibreOffice runtime not found (soffice is missing).",
  };
  return officeRuntimeCache;
}

export async function generateOfficePreviewPdf(buffer) {
  const runtime = getOfficeRuntimeStatus();
  if (!runtime.available) {
    return { ok: false, error: runtime.reason };
  }

  try {
    const pdfBuffer = await convertToPdf(buffer, ".pdf", undefined);
    if (!pdfBuffer?.length) {
      return { ok: false, error: "LibreOffice conversion returned empty output." };
    }
    return { ok: true, buffer: pdfBuffer };
  } catch (error) {
    return { ok: false, error: error?.message || "LibreOffice conversion failed." };
  }
}

export function getResourceTypeForMime(mimeType = "") {
  const normalized = String(mimeType).toLowerCase();
  return normalized.startsWith("image/") ? "image" : "raw";
}

export function sanitizeFileName(fileName = "attachment") {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64) || "attachment";
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10);
  return `${base}${safeExt || ""}`;
}

function stripImageExtension(publicId = "") {
  return String(publicId).replace(/\.(png|jpe?g|webp|gif|svg)$/i, "");
}

export async function uploadBufferToCloudinary(publicId, buffer, contentType, resourceType = "auto", options = {}) {
  let normalizedPublicId = String(publicId || "").replace(/\\/g, "/");
  if (resourceType === "image") {
    normalizedPublicId = stripImageExtension(normalizedPublicId);
  }
  const assetFolder = path.posix.dirname(normalizedPublicId);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: normalizedPublicId,
        asset_folder: assetFolder && assetFolder !== "." ? assetFolder : undefined,
        overwrite: Boolean(options.overwrite),
        resource_type: resourceType,
        type: "upload",
        access_mode: "public",
        folder: undefined,
        use_filename: false,
        unique_filename: false,
        invalidate: true,
        context: `mime_type=${contentType}`,
      },
      (error, result) => {
        if (error || !result) {
          reject(new Error(error?.message || "Failed to upload to Cloudinary"));
          return;
        }
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

function tryContentTypeFromPublicId(publicId = "") {
  const lowerPath = publicId.toLowerCase();
  if (lowerPath.endsWith(".png")) return "image/png";
  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) return "image/jpeg";
  if (lowerPath.endsWith(".webp")) return "image/webp";
  if (lowerPath.endsWith(".gif")) return "image/gif";
  if (lowerPath.endsWith(".svg")) return "image/svg+xml";
  if (lowerPath.endsWith(".pdf")) return "application/pdf";
  if (lowerPath.endsWith(".doc")) return "application/msword";
  if (lowerPath.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lowerPath.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (lowerPath.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (lowerPath.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lowerPath.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lowerPath.endsWith(".txt")) return "text/plain";
  if (lowerPath.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

function stripKnownExtension(publicId = "") {
  return String(publicId).replace(/\.(pdf|docx?|pptx?|xlsx?|png|jpe?g|webp|gif|svg|txt|zip)$/i, "");
}

export async function resolveCloudinaryResource(publicId) {
  const resourceTypes = ["raw", "image", "video"];
  for (const resourceType of resourceTypes) {
    const idsToTry = resourceType === "raw"
      ? [publicId]
      : [...new Set([publicId, stripKnownExtension(publicId)])];

    for (const candidateId of idsToTry) {
      try {
        const resource = await cloudinary.api.resource(candidateId, { resource_type: resourceType });
        return {
          ...resource,
          resource_type: resourceType,
          content_type: tryContentTypeFromPublicId(publicId),
        };
      } catch {
        // try next candidate id / resource type
      }
    }
  }
  return null;
}

export function buildCloudinarySignedDownloadUrl(publicId, resourceType = "raw") {
  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  return cloudinary.utils.private_download_url(String(publicId), undefined, {
    resource_type: resourceType,
    type: "upload",
    expires_at: expiresAt,
    attachment: false,
  });
}

export function buildObjectPath({
  scope,
  safeName,
  userId,
  classroomId,
  subjectId,
  assignmentId,
}) {
  const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const base = SCOPE_TO_PREFIX[scope] || SCOPE_TO_PREFIX.dm;

  if (scope === "study_material") {
    const cls = classroomId ? `classroom-${classroomId}` : "classroom-unknown";
    const sub = subjectId ? `subject-${subjectId}` : "subject-unknown";
    return `${base}/${cls}/${sub}/${unique}-${safeName}`;
  }

  if (scope === "assignment_submission") {
    const aid = assignmentId ? `assignment-${assignmentId}` : "assignment-unknown";
    return `${base}/${aid}/student-${userId}/${unique}-${safeName}`;
  }

  if (scope === "assignment_resource") {
    const aid = assignmentId ? `assignment-${assignmentId}` : "assignment-unknown";
    return `${base}/${aid}/teacher-${userId}/${unique}-${safeName}`;
  }

  return `${base}/${unique}-${safeName}`;
}
