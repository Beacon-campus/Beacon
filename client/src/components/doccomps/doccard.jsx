import { useState } from "react";
import { resolveAttachmentUrl } from "../../utils/cloudinaryUrl";
import DocViewer from "./docviewer";

export default function DocCard({ file, role, onRenameUpload, onDeleteUpload }) {
  const [open, setOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(file.name || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const resolvedUrl = resolveAttachmentUrl(file);
  const fileUrl = resolvedUrl || "";
  const fileDownloadUrl = resolvedUrl || "";
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
    <div 
      onClick={() => {
        // Only trigger click view on mobile where buttons are hidden
        if (!isRenaming && window.innerWidth <= 768 && fileUrl) setOpen(true);
      }}
      className={`border border-gray-100 rounded-2xl p-4 min-[769px]:p-5 bg-white hover:bg-[#F8FAFC] hover:border-gray-200 transition-all shadow-sm flex flex-col min-[769px]:justify-between min-[769px]:min-h-[140px] ${
        isRenaming 
          ? "max-[768px]:gap-3 max-[768px]:cursor-default" 
          : "max-[768px]:flex-row max-[768px]:items-center max-[768px]:gap-4 max-[768px]:cursor-pointer"
      }`}
    >
      <div className="flex-1 min-w-0 w-full">
        <div className="flex items-center min-[769px]:items-start gap-3 min-[769px]:mb-4">
          <div className="w-10 h-10 shrink-0 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <line x1="10" y1="9" x2="8" y2="9"/>
             </svg>
          </div>
          <div className="min-w-0 flex-1">
            {isRenaming ? (
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
            ) : (
              <p className="font-[600] text-gray-800 line-clamp-2 min-[769px]:line-clamp-3 leading-tight min-[769px]:pr-4 text-sm min-[769px]:text-base break-words">{file.name}</p>
            )}
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-2 min-[769px]:gap-5 text-[13px] font-semibold min-[769px]:pt-4 min-[769px]:border-t border-gray-50 flex-wrap justify-end shrink-0 ${isRenaming ? 'pt-2 border-t mt-1' : ''}`}>
        <button
          disabled={!fileUrl}
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="hidden min-[769px]:flex items-center justify-center p-2 min-[769px]:p-0 min-[769px]:gap-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 min-[769px]:hover:bg-transparent rounded-lg transition-colors disabled:opacity-40"
          title="View"
        >
          <svg className="w-5 h-5 min-[769px]:w-4 min-[769px]:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          <span className="hidden min-[769px]:inline">View</span>
        </button>

        <button
          disabled={!fileDownloadUrl}
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          className="hidden min-[769px]:flex items-center justify-center p-2 min-[769px]:p-0 min-[769px]:gap-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 min-[769px]:hover:bg-transparent rounded-lg transition-colors disabled:opacity-40"
          title="Download"
        >
          <svg className="w-5 h-5 min-[769px]:w-4 min-[769px]:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          <span className="hidden min-[769px]:inline">Download</span>
        </button>

        <div className="flex items-center min-[769px]:gap-4 min-[769px]:ml-auto">
            {canManage && !isRenaming && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 min-[769px]:p-1.5 rounded-lg min-[769px]:rounded-md transition-all"
                title="Rename file"
              >
                  <svg className="w-5 h-5 min-[769px]:w-4 min-[769px]:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
            )}

            {canManage && isRenaming && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRenameSave(); }}
                  disabled={isSavingName}
                  className="text-green-600 hover:text-green-700 font-bold px-2 py-1 disabled:opacity-50 transition-colors"
                >
                  {isSavingName ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNameDraft(file.name || "");
                    setIsRenaming(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 font-bold px-2 py-1 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}

            {canManage && !isRenaming && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={isDeleting}
                className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 min-[769px]:p-1.5 rounded-lg min-[769px]:rounded-md disabled:opacity-50 transition-all"
                title="Delete file"
              >
                {isDeleting ? "..." : <svg className="w-5 h-5 min-[769px]:w-4 min-[769px]:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>}
              </button>
            )}
        </div>
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
