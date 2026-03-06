import DocList from "./doclist";

export default function DocLayout({
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
  return (
    <div className="p-6">
      <DocList
        role={role}
        classroom={classroom}
        subject={subject}
        uploads={uploads}
        onBack={onBack}
        onUpload={onUpload}
        onRenameUpload={onRenameUpload}
        onDeleteUpload={onDeleteUpload}
        uploading={uploading}
      />
    </div>
  );
}
