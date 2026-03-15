const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";

function encodePublicId(publicId = "") {
  return String(publicId)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildCloudinaryUrl({ publicId, version, resourceType, optimized = false }) {
  if (!CLOUDINARY_CLOUD_NAME || !publicId || !version || !resourceType) return null;
  const encodedId = encodePublicId(publicId);
  const isImage = resourceType === "image";
  if (optimized && isImage) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/v${version}/${encodedId}`;
  }
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload/v${version}/${encodedId}`;
}
