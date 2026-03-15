import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import ImagePreviewModal from "../ui/ImagePreviewModal";
import { resolveAttachmentUrl } from "../../utils/cloudinaryUrl";

export default function DocViewer({ file, onClose }) {
  if (!file) return null;

  const resolvedUrl = resolveAttachmentUrl(file);
  const sourceUrl = file.previewUrl || resolvedUrl || file.url;
  const sourceType = file.previewType || file.mimeType || file.type;
  const isImage = sourceType?.startsWith("image/");
  const isPdf = sourceType === "application/pdf";

  const OFFICE_TYPES = [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const isOfficeDoc = OFFICE_TYPES.includes(sourceType);
  const canInlinePreview = !!sourceUrl && (isImage || isPdf || !isOfficeDoc);
  const previewStatus = file.previewStatus || null;
  const previewError = file.previewError || null;
  const originalDownloadUrl = file.downloadUrl || resolvedUrl || file.url || "";
  const [isLoading, setIsLoading] = useState(canInlinePreview);

  useEffect(() => {
    setIsLoading(canInlinePreview);
  }, [canInlinePreview, sourceUrl]);

  if (isImage) {
    return (
      <ImagePreviewModal
        isOpen={!!file}
        onClose={onClose}
        imageUrl={sourceUrl}
        imageName={file.name}
      />
    );
  }

  return (
    <Modal
      isOpen={!!file}
      onClose={onClose}
      className="!bg-transparent !shadow-none overflow-visible flex flex-col items-center justify-center p-0 !max-w-none !w-auto gap-4 pointer-events-none"
      overlayClassName="!p-4 flex items-center justify-center"
      backdropClassName="bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-white rounded-xl w-[90vw] h-[90vh] max-w-none overflow-hidden shadow-lg flex flex-col relative z-40 pointer-events-auto">
        {canInlinePreview ? (
          <iframe
            src={sourceUrl}
            title={file.name}
            className="w-full h-full"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-sm text-gray-600">Preview is not available for this file yet.</p>
            {previewStatus && previewStatus !== "none" && (
              <p className="text-xs text-gray-500">
                Preview status: <span className="font-semibold">{previewStatus}</span>
              </p>
            )}
            {previewError && (
              <p className="text-xs text-red-500 max-w-xl break-words">{previewError}</p>
            )}
            <div className="flex items-center gap-4 text-sm">
              <a href={resolvedUrl || file.url} target="_blank" rel="noreferrer" className="underline">
                Open Original
              </a>
              <a href={originalDownloadUrl} download={file.name || "file"} className="underline">
                Download
              </a>
            </div>
          </div>
        )}
        {canInlinePreview && isLoading && (
          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-4 z-10">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium animate-pulse">Loading Original Documents...</p>
          </div>
        )}
      </div>
      <div className="text-white/80 text-sm font-medium animate-pulse pointer-events-auto cursor-pointer" onClick={onClose}>
        Tap outside to close
      </div>
    </Modal>
  );
}
