import { useState } from "react";
import DocViewer from "./docviewer";

export default function DocCard({ file, role, onRenameUpload, onDeleteUpload }) {
  const [open, setOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(file.name || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileUrl = file.url || "";
  const fileDownloadUrl = file.downloadUrl || file.url || "";
  const canManage = role === "teacher" && !String(file._id || "").startsWith("mock-");

  const handleDownload = () => {
    if (!fileDownloadUrl) return;
    const link = document.createElement("a");
    link.href = fileDownloadUrl;
    link.download = file.name || "file";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRenameSave = async () => {
    if (!canManage || typeof onRenameUpload !== "function") return;
    const cleanName = nameDraft.trim();
    if (!cleanName || cleanName === file.name) {
      setIsRenaming(false);
      return;
    }

    try {
      setIsSavingName(true);
      await onRenameUpload(file, cleanName);
      setIsRenaming(false);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDelete = async () => {
    if (!canManage || typeof onDeleteUpload !== "function") return;
    try {
      setIsDeleting(true);
      await onDeleteUpload(file);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="border rounded-xl p-4 bg-white hover:bg-gray-50 transition">
        {isRenaming ? (
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
            autoFocus
          />
        ) : (
          <p className="font-medium text-primary truncate">{file.name}</p>
        )}

        <div className="flex gap-3 mt-3 text-sm text-gray-600">
          <button
            disabled={!fileUrl}
            onClick={() => setOpen(true)}
            className="hover:underline disabled:opacity-50"
          >
            View
          </button>

          <button
            disabled={!fileDownloadUrl}
            onClick={handleDownload}
            className="hover:underline disabled:opacity-50"
          >
            Download
          </button>

          {canManage && !isRenaming && (
            <button
              onClick={() => setIsRenaming(true)}
              className="hover:underline text-gray-500"
            >
              Rename
            </button>
          )}

          {canManage && isRenaming && (
            <>
              <button
                onClick={handleRenameSave}
                disabled={isSavingName}
                className="hover:underline text-gray-600 disabled:opacity-50"
              >
                {isSavingName ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setNameDraft(file.name || "");
                  setIsRenaming(false);
                }}
                className="hover:underline text-gray-500"
              >
                Cancel
              </button>
            </>
          )}

          {canManage && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="hover:underline text-red-500 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      {open && (
        <DocViewer
          file={file}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
