import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import DocLayout from "../../../components/doccomps/doclayout";
import { auth } from "../../../firebase/firebase";
import apiClient from "../../../services/apiClient";
import { getOrFetchPageCache, setPageCache } from "../../../services/pageCache.service";
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
        const userKey = auth.currentUser?.uid || "guest";
        const data = await getOrFetchPageCache(
          "teacher:study-materials",
          userKey,
          async () => {
            const response = await apiClient.get("/classroom/study-materials/teacher");
            return response.data || [];
          },
          { ttlMs: 120_000 }
        );
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

      const uploaded = await uploadAttachment(file, "study_material");
      const payload = {
        type: "file",
        name: displayName || uploaded.name || file.name,
        mimeType: uploaded.mimeType || uploaded.type || file.type || "application/octet-stream",
        url: uploaded.url,
        downloadUrl: uploaded.downloadUrl || uploaded.url,
        path: uploaded.path || null,
        publicId: uploaded.publicId || null,
        version: uploaded.version || null,
        resourceType: uploaded.resourceType || null,
        format: uploaded.format || null,
        secureUrl: uploaded.secureUrl || uploaded.url || null,
        cloudinary: uploaded.cloudinary || null,
        previewUrl: uploaded.previewUrl || null,
        previewDownloadUrl: uploaded.previewDownloadUrl || null,
        previewPath: uploaded.previewPath || null,
        previewType: uploaded.previewType || null,
        previewStatus: uploaded.previewStatus || null,
        previewError: uploaded.previewError || null,
        size: uploaded.size || file.size || 0,
      };

      const { data } = await apiClient.post(
        `/classroom/study-materials/${selectedClassroom._id}/subjects/${subject._id}/uploads`,
        payload
      );

      const createdUpload = data?.upload;
      if (createdUpload) {
        setClassrooms((prev) => {
          const next = prev.map((cls) =>
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
          );
          setPageCache("teacher:study-materials", auth.currentUser?.uid || "guest", next, 120_000);
          return next;
        });
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
      await apiClient.patch(
        `/classroom/study-materials/${selectedClassroom._id}/subjects/${selectedSubject._id}/uploads/${file._id}`,
        { name: newName }
      );

      setClassrooms((prev) => {
        const next = prev.map((cls) =>
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
        );
        setPageCache("teacher:study-materials", auth.currentUser?.uid || "guest", next, 120_000);
        return next;
      });
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
      await apiClient.delete(
        `/classroom/study-materials/${selectedClassroom._id}/subjects/${selectedSubject._id}/uploads/${file._id}`
      );

      setClassrooms((prev) => {
        const next = prev.map((cls) =>
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
        );
        setPageCache("teacher:study-materials", auth.currentUser?.uid || "guest", next, 120_000);
        return next;
      });
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
              <p className="text-xs text-gray-400 mt-2 font-medium">
                {(cls.subjects || []).length} {((cls.subjects || []).length) === 1 ? 'subject' : 'subjects'} assigned
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
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => setSelectedClassroomId(null)}
            className="group flex items-center gap-2 px-4 py-2 hover:bg-gray-100/80 text-gray-500 hover:text-gray-900 rounded-xl transition-all active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current transition-transform group-hover:-translate-x-1">
              <path d="M10,22.03c-.77,0-1.51-.3-2.09-.88L1.18,14.82c-1.57-1.57-1.57-4.09-.02-5.64,0,0,.01-.01,.02-.02L7.93,2.81c.84-.85,2.09-1.1,3.22-.63s1.84,1.52,1.85,2.74v2.06h7.03c2.19,0,3.97,1.8,3.97,4.01v1.98c0,2.21-1.78,4.01-3.97,4.01h-7.03v2.06c0,1.23-.71,2.28-1.85,2.75-.38,.16-.77,.23-1.15,.23Z" />
            </svg>
            <span className="font-semibold text-sm">Go back</span>
          </button>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">{selectedClassroom.name}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {(selectedClassroom.subjects || []).map((sub) => (
            <button
              key={sub._id}
              onClick={() => setSelectedSubjectId(sub._id)}
              className="group relative border border-gray-100 rounded-2xl p-6 bg-white hover:bg-[#F8FAFC] hover:border-gray-200 text-left transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98] flex flex-col"
            >
              <div className="absolute top-4 right-4 bg-[#F0FDF4] text-[#15803D] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flexItemsCenter justify-center leading-none">
                {(sub.uploads || []).length} upload{(sub.uploads || []).length !== 1 && 's'}
              </div>
              <p className="font-bold text-lg text-gray-800 tracking-tight pr-20">{sub.name}</p>
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
