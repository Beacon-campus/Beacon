import { useRef, useState } from "react";

const DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function UploadDoc({ subject, onUpload, uploading = false }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  const openPicker = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const isDoc = DOC_TYPES.includes(selected.type);
    const isImage = IMAGE_TYPES.includes(selected.type);
    if (!isDoc && !isImage) {
      setError("Unsupported file format");
      setFile(null);
      return;
    }

    setError("");
    setFile(selected);
    setDisplayName(selected.name || "");
  };

  const handleUpload = async () => {
    if (!file || typeof onUpload !== "function") return;
    try {
      await onUpload(file, subject, displayName.trim() || file.name);
      setFile(null);
      setDisplayName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
      setError("Upload failed");
    }
  };

  return (
    <div className="border rounded-xl p-4 bg-green-200 space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
      />

      {!file ? (
        <button onClick={openPicker} className="font-medium">
          + Upload document
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm">
            Selected: <strong>{file.name}</strong>
          </p>
          <div className="space-y-1">
            <label className="text-xs text-gray-600 font-medium">
              Display name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
              placeholder="Enter display name"
            />
          </div>
          <div className="flex gap-3 text-sm">
            <button
              onClick={handleUpload}
              disabled={uploading || !(displayName.trim() || file.name)}
              className="underline disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <button
              onClick={() => {
                setFile(null);
                setDisplayName("");
              }}
              className="underline text-red-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
