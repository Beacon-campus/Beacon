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
          className="group flex items-center gap-2 px-4 py-2 hover:bg-gray-100/80 text-gray-500 hover:text-gray-900 rounded-xl transition-all active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current transition-transform group-hover:-translate-x-1">
            <path d="M10,22.03c-.77,0-1.51-.3-2.09-.88L1.18,14.82c-1.57-1.57-1.57-4.09-.02-5.64,0,0,.01-.01,.02-.02L7.93,2.81c.84-.85,2.09-1.1,3.22-.63s1.84,1.52,1.85,2.74v2.06h7.03c2.19,0,3.97,1.8,3.97,4.01v1.98c0,2.21-1.78,4.01-3.97,4.01h-7.03v2.06c0,1.23-.71,2.28-1.85,2.75-.38,.16-.77,.23-1.15,.23Z" />
          </svg>
          <span className="font-semibold text-sm">Go back</span>
        </button>

        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-bold text-gray-800 tracking-tight">
            {subject?.name || "Subject"}
          </h2>
          {classroom?.name && (
            <>
              <span className="text-gray-300 font-medium">/</span>
              <p className="text-sm font-medium text-gray-400 tracking-tight">
                {classroom.name}
              </p>
            </>
          )}
        </div>
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
