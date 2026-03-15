const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";

function encodePublicId(publicId = "") {
  return String(publicId)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildCloudinaryUrl({ publicId, version, resourceType, optimized = false }) {
  if (!cloudName || !publicId || !version || !resourceType) return null;
  const encodedId = encodePublicId(publicId);
  const isImage = resourceType === "image";
  if (optimized && isImage) {
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/v${version}/${encodedId}`;
  }
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/v${version}/${encodedId}`;
}

export function resolveAttachmentUrl(attachment, { optimized = false } = {}) {
  if (!attachment) return null;
  const cloudinary = attachment.cloudinary || null;
  if (cloudinary?.secureUrl) {
    if (optimized && cloudinary.resourceType === "image") {
      return (
        buildCloudinaryUrl({
          publicId: cloudinary.publicId,
          version: cloudinary.version,
          resourceType: cloudinary.resourceType,
          optimized: true,
        }) || cloudinary.secureUrl
      );
    }
    return cloudinary.secureUrl;
  }
  return attachment.secureUrl || attachment.url || null;
}
