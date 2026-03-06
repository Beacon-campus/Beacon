import axios from "axios";
import imageCompression from "browser-image-compression";
import { auth } from "../firebase/firebase";
import { server } from "../main";

export const SUPPORTED_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const ACCEPTED_ATTACHMENT_EXTENSIONS = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp";
export const MAX_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_SOURCE_SIZE_BYTES = 12 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function validateAttachmentFile(file) {
  if (!file) throw new Error("No file selected");
  if (!SUPPORTED_ATTACHMENT_MIME_TYPES.includes(file.type)) {
    throw new Error("Unsupported file type");
  }
  if (file.type.startsWith("image/")) {
    if (file.size > MAX_IMAGE_SOURCE_SIZE_BYTES) {
      throw new Error("Image too large. Max 12MB before compression");
    }
    return;
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error("File too large. Max 2MB");
  }
}

async function compressImageIfNeeded(file) {
  if (!file?.type?.startsWith("image/")) return file;

  const maxSizeMB = Math.max(0.2, MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024) - 0.1);
  const options = {
    maxSizeMB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8,
    fileType: file.type,
  };

  try {
    const compressed = await imageCompression(file, options);
    return compressed;
  } catch {
    // Fallback: proceed with original image; server/client size guard still applies.
    return file;
  }
}

export async function uploadAttachment(file, scope = "dm") {
  validateAttachmentFile(file);
  const processedFile = await compressImageIfNeeded(file);

  if (processedFile.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error("File too large after compression. Max 2MB");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const token = await currentUser.getIdToken();
  const dataUrl = await readFileAsDataUrl(processedFile);

  const { data } = await axios.post(
    `${server}/uploads/chat-attachment`,
    {
      fileName: processedFile.name || file.name,
      fileType: processedFile.type || file.type,
      fileSize: processedFile.size,
      dataUrl,
      scope,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return {
    name: data.name || processedFile.name || file.name,
    type: data.type || processedFile.type || file.type,
    size: Number(data.size || processedFile.size || file.size),
    kind: data.kind || ((processedFile.type || file.type).startsWith("image/") ? "image" : "file"),
    url: data.url,
    downloadUrl: data.downloadUrl || data.url,
    path: data.path || null,
    previewUrl: data.previewUrl || null,
    previewDownloadUrl: data.previewDownloadUrl || null,
    previewPath: data.previewPath || null,
    previewType: data.previewType || null,
    previewStatus: data.previewStatus || null,
    previewError: data.previewError || null,
  };
}
