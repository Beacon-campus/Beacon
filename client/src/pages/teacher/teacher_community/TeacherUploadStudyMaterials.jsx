import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import DocLayout from "../../../components/doccomps/doclayout";
import { auth } from "../../../firebase/firebase";
import { server } from "../../../main";
import { uploadAttachment } from "../../../utils/attachmentUpload";

export default function TeacherUploadStudyMaterials() {
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const { data } = await axios.get(`${server}/classroom/study-materials/teacher`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClassrooms(data || []);
      } catch (error) {
        console.error("Failed to fetch teacher study materials:", error);
        toast.error("Failed to load classrooms");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedClassroom = useMemo(
    () => classrooms.find((c) => c._id === selectedClassroomId) || null,
    [classrooms, selectedClassroomId]
  );

  const selectedSubject = useMemo(
    () => selectedClassroom?.subjects?.find((s) => s._id === selectedSubjectId) || null,
    [selectedClassroom, selectedSubjectId]
  );

  const handleMockUpload = async (file, subject, displayName) => {
    if (!selectedClassroom || !subject) return;
    try {
      setUploading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const uploaded = await uploadAttachment(file, "study_material");
      const payload = {
        name: displayName || uploaded.name || file.name,
        type: uploaded.type || file.type || "application/octet-stream",
        url: uploaded.url,
        downloadUrl: uploaded.downloadUrl || uploaded.url,
        path: uploaded.path || null,
        previewUrl: uploaded.previewUrl || null,
        previewDownloadUrl: uploaded.previewDownloadUrl || null,
        previewPath: uploaded.previewPath || null,
        previewType: uploaded.previewType || null,
        previewStatus: uploaded.previewStatus || null,
        previewError: uploaded.previewError || null,
        size: uploaded.size || file.size || 0,
      };

      const { data } = await axios.post(
        `${server}/classroom/study-materials/${selectedClassroom._id}/subjects/${subject._id}/uploads`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const createdUpload = data?.upload;
      if (createdUpload) {
        setClassrooms((prev) =>
          prev.map((cls) =>
            cls._id !== selectedClassroom._id
              ? cls
              : {
                  ...cls,
                  subjects: (cls.subjects || []).map((sub) =>
                    sub._id !== subject._id
                      ? sub
                      : { ...sub, uploads: [...(sub.uploads || []), createdUpload] }
                  ),
                }
          )
        );
      }

      toast.success("Material uploaded");
    } catch (error) {
      console.error("Mock upload failed:", error);
      toast.error(error?.response?.data?.error || "Upload failed");
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleRenameUpload = async (file, newName) => {
    if (!selectedClassroom || !selectedSubject) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      await axios.patch(
        `${server}/classroom/study-materials/${selectedClassroom._id}/subjects/${selectedSubject._id}/uploads/${file._id}`,
        { name: newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setClassrooms((prev) =>
        prev.map((cls) =>
          cls._id !== selectedClassroom._id
            ? cls
            : {
                ...cls,
                subjects: (cls.subjects || []).map((sub) =>
                  sub._id !== selectedSubject._id
                    ? sub
                    : {
                        ...sub,
                        uploads: (sub.uploads || []).map((upload) =>
                          upload._id === file._id ? { ...upload, name: newName } : upload
                        ),
                      }
                ),
              }
        )
      );
      toast.success("Display name updated");
    } catch (error) {
      console.error("Rename upload failed:", error);
      toast.error(error?.response?.data?.error || "Failed to rename");
      throw error;
    }
  };

  const handleDeleteUpload = async (file) => {
    if (!selectedClassroom || !selectedSubject) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      await axios.delete(
        `${server}/classroom/study-materials/${selectedClassroom._id}/subjects/${selectedSubject._id}/uploads/${file._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setClassrooms((prev) =>
        prev.map((cls) =>
          cls._id !== selectedClassroom._id
            ? cls
            : {
                ...cls,
                subjects: (cls.subjects || []).map((sub) =>
                  sub._id !== selectedSubject._id
                    ? sub
                    : {
                        ...sub,
                        uploads: (sub.uploads || []).filter((upload) => upload._id !== file._id),
                      }
                ),
              }
        )
      );
      toast.success("Material deleted");
    } catch (error) {
      console.error("Delete upload failed:", error);
      toast.error(error?.response?.data?.error || "Failed to delete");
      throw error;
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading study materials...</div>;
  }

  if (!selectedClassroom) {
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary">Select a Classroom</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((cls) => (
            <button
              key={cls._id}
              onClick={() => setSelectedClassroomId(cls._id)}
              className="border rounded-xl p-5 bg-white hover:bg-gray-50 text-left transition"
            >
              <p className="font-semibold text-primary">{cls.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                Sem {cls.metadata?.semester} • {cls.metadata?.shift}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {(cls.subjects || []).length} subject(s) assigned
              </p>
            </button>
          ))}
          {classrooms.length === 0 && (
            <p className="text-sm text-gray-500">No assigned classrooms found.</p>
          )}
        </div>
      </div>
    );
  }

  if (!selectedSubject) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedClassroomId(null)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Back
          </button>
          <h2 className="text-lg font-semibold text-primary">{selectedClassroom.name}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {(selectedClassroom.subjects || []).map((sub) => (
            <button
              key={sub._id}
              onClick={() => setSelectedSubjectId(sub._id)}
              className="group relative border border-gray-100 rounded-2xl p-6 bg-white hover:bg-[#F8FAFC] hover:border-gray-200 text-left transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98] flex flex-col"
            >
              <div className="absolute top-4 right-4 bg-[#F0FDF4] text-[#15803D] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                {(sub.uploads || []).length} upload{(sub.uploads || []).length !== 1 && 's'}
              </div>
              <p className="font-[600] text-lg text-gray-800 tracking-tight pr-16">{sub.name}</p>
              <p className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-widest">{sub.code}</p>
            </button>
          ))}
          {(selectedClassroom.subjects || []).length === 0 && (
            <p className="text-sm text-gray-500">No subjects assigned in this classroom.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <DocLayout
      role="teacher"
      classroom={selectedClassroom}
      subject={selectedSubject}
      uploads={selectedSubject.uploads || []}
      onBack={() => setSelectedSubjectId(null)}
      onUpload={handleMockUpload}
      onRenameUpload={handleRenameUpload}
      onDeleteUpload={handleDeleteUpload}
      uploading={uploading}
    />
  );
}
