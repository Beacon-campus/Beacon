import DocCard from "./doccard";
import UploadDoc from "./uploaddoc";

export default function DocList({
  role,
  classroom,
  subject,
  uploads = [],
  onBack,
  onUpload,
  onRenameUpload,
  onDeleteUpload,
  uploading = false,
}) {
  const docs = uploads || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>

        <h2 className="text-[16px] min-[769px]:text-xl font-black text-gray-800 tracking-tight leading-none truncate">
          {subject?.name || "Subject"}
        </h2>
      </div>

      <div className="flex flex-col gap-3 min-[769px]:grid min-[769px]:grid-cols-2 min-[1024px]:grid-cols-3 min-[769px]:gap-4">
        {role === "teacher" && (
          <UploadDoc
            subject={subject}
            onUpload={onUpload}
            uploading={uploading}
          />
        )}
        {docs.map((doc) => (
          <DocCard
            key={doc._id || doc.id}
            file={doc}
            role={role}
            onRenameUpload={onRenameUpload}
            onDeleteUpload={onDeleteUpload}
          />
        ))}
      </div>
    </div>
  );
}
