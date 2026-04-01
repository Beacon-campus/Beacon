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
    <div className="border border-dashed border-gray-300 rounded-xl min-[769px]:rounded-2xl p-4 min-[769px]:p-6 bg-[#F9FAFB] hover:bg-gray-50 flex flex-col items-center justify-center transition-colors min-[769px]:min-h-[140px] gap-3">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
      />

      {!file ? (
        <button onClick={openPicker} className="flex max-[768px]:flex-row min-[769px]:flex-col items-center gap-3 min-[769px]:gap-2 text-gray-500 hover:text-gray-700 w-full h-full justify-center min-[769px]:justify-center max-[768px]:justify-start">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <span className="font-semibold text-sm max-[768px]:text-base text-gray-700">Upload document</span>
        </button>
      ) : (
        <div className="space-y-2 w-full text-left">
          <p className="text-sm">
            Selected: <strong>{file.name}</strong>
          </p>
          <div className="space-y-1 w-full text-left mt-2">
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              Display name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20"
              placeholder="Enter display name"
            />
          </div>
          <div className="flex gap-3 text-sm pt-2">
            <button
              onClick={handleUpload}
              disabled={uploading || !(displayName.trim() || file.name)}
              className="px-4 py-1.5 bg-[#0F172A] text-white rounded-lg font-medium disabled:opacity-50 hover:bg-slate-800 transition-colors"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <button
              onClick={() => {
                setFile(null);
                setDisplayName("");
              }}
              className="px-4 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-red-600 transition-colors"
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
