import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import DocLayout from "../../../components/doccomps/doclayout";
import { auth } from "../../../firebase/firebase";
import { server } from "../../../main";

export default function StudentStudyMaterials() {
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const { data } = await axios.get(`${server}/classroom/study-materials/student`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClassrooms(data || []);
      } catch (error) {
        console.error("Failed to fetch student study materials:", error);
        toast.error("Failed to load study materials");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedClassroomId && classrooms.length > 0) {
      setSelectedClassroomId(classrooms[0]._id);
    }
  }, [classrooms, selectedClassroomId]);

  const selectedClassroom = useMemo(
    () => classrooms.find((c) => c._id === selectedClassroomId) || null,
    [classrooms, selectedClassroomId]
  );

  const selectedSubject = useMemo(
    () => selectedClassroom?.subjects?.find((s) => s._id === selectedSubjectId) || null,
    [selectedClassroom, selectedSubjectId]
  );

  if (loading) {
    return <div className="p-6 text-gray-500">Loading study materials...</div>;
  }

  if (!selectedClassroom) {
    return <div className="p-6 text-gray-500">No enrolled classroom found.</div>;
  }

  if (!selectedSubject) {
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary">{selectedClassroom.name}</h2>
        <p className="text-sm text-gray-500">Select a subject</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {(selectedClassroom.subjects || []).map((sub) => (
            <button
              key={sub._id}
              onClick={() => setSelectedSubjectId(sub._id)}
              className="group relative border border-gray-100 rounded-2xl p-6 bg-white hover:bg-[#F8FAFC] hover:border-gray-200 text-left transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98] flex flex-col"
            >
              <div className="absolute top-4 right-4 bg-[#F0FDF4] text-[#15803D] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                {(sub.uploads || []).length} material{(sub.uploads || []).length !== 1 && 's'}
              </div>
              <p className="font-[600] text-lg text-gray-800 tracking-tight pr-16">{sub.name}</p>
              <p className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-widest">{sub.code}</p>
            </button>
          ))}
          {(selectedClassroom.subjects || []).length === 0 && (
            <p className="text-sm text-gray-500">No subjects found in your classroom.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <DocLayout
      role="student"
      classroom={selectedClassroom}
      subject={selectedSubject}
      uploads={selectedSubject.uploads || []}
      onBack={() => setSelectedSubjectId(null)}
    />
  );
}
