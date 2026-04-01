import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-hot-toast";
import DocLayout from "../../../components/doccomps/doclayout";
import { auth } from "../../../firebase/firebase";
import apiClient from "../../../services/apiClient";
import { getOrFetchPageCache, setPageCache } from "../../../services/pageCache.service";
import { uploadAttachment } from "../../../utils/attachmentUpload";
import LoadingState from "../../../components/ui/LoadingState";

export default function TeacherUploadStudyMaterials() {
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { setBreadcrumbExtra } = useOutletContext() || {};

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

  useEffect(() => {
    if (!setBreadcrumbExtra) return;
    if (selectedSubject) {
      setBreadcrumbExtra([selectedClassroom?.name, selectedSubject?.name]);
    } else if (selectedClassroom) {
      setBreadcrumbExtra([selectedClassroom?.name]);
    } else {
      setBreadcrumbExtra([]);
    }
    return () => setBreadcrumbExtra?.([]);
  }, [selectedClassroom, selectedSubject, setBreadcrumbExtra]);

  const handleMockUpload = async (file, subject, displayName) => {
    if (!selectedClassroom || !subject) return;
    try {
      setUploading(true);

      const uploaded = await uploadAttachment(file, "study_material");
      const payload = {
        type: "file",
        name: displayName || uploaded.name || file.name,
        mimeType: uploaded.mimeType || uploaded.type || file.type || "application/octet-stream",
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
    return (
      <div className="p-6 text-gray-500 flex items-center justify-center">
        <LoadingState size="md" />
      </div>
    );
  }

  if (!selectedClassroom) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Page Heading — visible on all views */}
        <div className="shrink-0 px-4 pt-4 pb-3 min-[769px]:px-6 min-[769px]:pt-5 min-[769px]:pb-4">
          <h1 className="text-[1.4rem] min-[769px]:text-2xl font-black min-[769px]:font-bold tracking-tight text-primary min-[769px]:text-gray-800 leading-tight">Upload Materials</h1>
          <p className="text-[11px] min-[769px]:text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">Select a classroom to get started</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 min-[769px]:px-6 no-scrollbar">
          <div className="flex flex-col gap-3 min-[769px]:grid min-[769px]:grid-cols-2 min-[1024px]:grid-cols-3">
            {classrooms.map((cls) => (
              <button
                key={cls._id}
                onClick={() => setSelectedClassroomId(cls._id)}
                className="border border-gray-100 rounded-2xl p-4 min-[769px]:p-5 bg-white hover:bg-gray-50 hover:border-gray-200 text-left transition-all shadow-sm hover:shadow active:scale-[0.98] flex items-center gap-3 min-[769px]:flex-col min-[769px]:items-start"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#059669]">
                    <path d="m23,24h-5c-.4,0-.761-.238-.919-.605s-.082-.794.194-1.084c.792-.833,1.967-1.311,3.225-1.311s2.433.478,3.225,1.311c.276.29.352.717.194,1.084s-.519.605-.919.605Zm-7.581-.605c.158-.367.082-.794-.194-1.084-.792-.833-1.967-1.311-3.225-1.311s-2.433.478-3.225,1.311c-.276.29-.352.717-.194,1.084s.519.605.919.605h5c.4,0,.761-.238.919-.605Zm-8.5,0c.158-.367.082-.794-.194-1.084-.792-.833-1.967-1.311-3.225-1.311s-2.433.478-3.225,1.311c-.276.29-.352.717-.194,1.084s.519.605.919.605h5c.4,0,.761-.238.919-.605Zm-3.419-3.395c1.105,0,2-.895,2-2s-.895-2-2-2-2,.895-2,2,.895,2,2,2Zm8.5,0c1.105,0,2-.895,2-2s-.895-2-2-2-2,.895-2,2,.895,2,2,2Zm8.5,0c1.105,0,2-.895,2-2s-.895-2-2-2-2,.895-2,2,.895,2,2,2ZM4.5,5c1.381,0,2.5-1.119,2.5-2.5S5.881,0,4.5,0s-2.5,1.119-2.5,2.5,1.119,2.5,2.5,2.5ZM20.5,0h-12.26c.479.715.76,1.575.76,2.5,0,.529-.108,1.029-.276,1.5h5.157c1.451,0,2.784.978,3.06,2.402.372,1.915-1.092,3.598-2.942,3.598h-4v3c0,.552.448,1,1,1h5v-1c0-.552.448-1,1-1h2c.552,0,1,.448,1,1v1h.5c1.933,0,3.5-1.567,3.5-3.5V3.5c0-1.933-1.567-3.5-3.5-3.5Zm-12.5,13v-5h6c.553,0,1-.448,1-1s-.447-1-1-1H4C1.791,6,0,7.791,0,10v3c0,.552.448,1,1,1h6c.552,0,1-.448,1-1Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[15px] text-gray-800 truncate">{cls.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Sem {cls.metadata?.semester} · {cls.metadata?.shift}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                    {(cls.subjects || []).length} {((cls.subjects || []).length) === 1 ? 'subject' : 'subjects'}
                  </p>
                </div>
              </button>
            ))}
            {classrooms.length === 0 && (
              <p className="text-sm text-gray-500 col-span-full">No assigned classrooms found.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedSubject) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Page Heading */}
        <div className="shrink-0 px-4 pt-4 pb-3 min-[769px]:px-6 min-[769px]:pt-5 min-[769px]:pb-4 flex items-center gap-3">
          <button
            onClick={() => setSelectedClassroomId(null)}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-[1.4rem] min-[769px]:text-2xl font-black min-[769px]:font-bold tracking-tight text-primary min-[769px]:text-gray-800 leading-tight truncate">{selectedClassroom.name}</h1>
            <p className="text-[11px] min-[769px]:text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">Select a subject</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 min-[769px]:px-6 no-scrollbar">
          <div className="flex flex-col gap-3 min-[769px]:grid min-[769px]:grid-cols-2 min-[1024px]:grid-cols-3">
            {(selectedClassroom.subjects || []).map((sub) => (
              <button
                key={sub._id}
                onClick={() => setSelectedSubjectId(sub._id)}
                className="border border-gray-100 rounded-2xl p-4 min-[769px]:p-5 bg-white hover:bg-[#F8FAFC] hover:border-gray-200 text-left transition-all shadow-sm hover:shadow active:scale-[0.98] flex items-center gap-3 min-[769px]:flex-col min-[769px]:items-start relative"
              >
                <div className="absolute top-3 right-3 bg-[#F0FDF4] text-[#15803D] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {(sub.uploads || []).length} upload{(sub.uploads || []).length !== 1 && 's'}
                </div>
                <div className="min-w-0 pr-16 min-[769px]:pr-0">
                  <p className="font-bold text-[15px] text-gray-800 truncate">{sub.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{sub.code}</p>
                </div>
              </button>
            ))}
            {(selectedClassroom.subjects || []).length === 0 && (
              <p className="text-sm text-gray-500">No subjects assigned in this classroom.</p>
            )}
          </div>
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
