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
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-3 px-5 py-2.5 bg-primary text-white rounded-xl shadow-md hover:bg-black transition-all hover:scale-105 active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-white">
            <path d="M10,22.03c-.77,0-1.51-.3-2.09-.88L1.18,14.82c-1.57-1.57-1.57-4.09-.02-5.64,0,0,.01-.01,.02-.02L7.93,2.81c.84-.85,2.09-1.1,3.22-.63s1.84,1.52,1.85,2.74v2.06h7.03c2.19,0,3.97,1.8,3.97,4.01v1.98c0,2.21-1.78,4.01-3.97,4.01h-7.03v2.06c0,1.23-.71,2.28-1.85,2.75-.38,.16-.77,.23-1.15,.23Z" />
          </svg>
          <span className="font-bold text-sm">Go back</span>
        </button>

        <h2 className="text-xl font-bold text-primary">
          {subject?.name || "Subject"}
        </h2>
        <p className="text-sm text-gray-500">
          {classroom?.name || ""}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {docs.map((doc) => (
          <DocCard
            key={doc._id || doc.id}
            file={doc}
            role={role}
            onRenameUpload={onRenameUpload}
            onDeleteUpload={onDeleteUpload}
          />
        ))}
        {role === "teacher" && (
          <UploadDoc
            subject={subject}
            onUpload={onUpload}
            uploading={uploading}
          />
        )}
      </div>
    </div>
  );
}
