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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(selectedClassroom.subjects || []).map((sub) => (
            <button
              key={sub._id}
              onClick={() => setSelectedSubjectId(sub._id)}
              className="border rounded-xl p-5 bg-white hover:bg-gray-50 text-left transition"
            >
              <p className="font-semibold text-primary">{sub.name}</p>
              <p className="text-sm text-gray-500 mt-1">{sub.code}</p>
              <p className="text-xs text-gray-400 mt-2">
                {(sub.uploads || []).length} material(s)
              </p>
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
