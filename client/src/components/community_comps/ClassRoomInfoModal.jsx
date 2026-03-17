import React, { useState, useEffect } from "react";
import axios from "axios";
import Modal from "../ui/Modal";
import BookIcon from "../../assets/classroom/book.svg";
import { getAvatarUrl } from "../../utils/avatarUtils";
import UserListItem from "../shared/UserListItem";
import { server } from "../../main";
import { auth } from "../../firebase/firebase";
import LoadingState from "../ui/LoadingState";

const AESTHETIC_COLORS = ["#FFD1DC", "#FFABAB", "#FFC3A0", "#FF677D", "#D4A5A5", "#B5EAD7", "#C7CEEA", "#E2F0CB", "#FF9AA2", "#FFDAC1"];

const getClassroomColor = (id) => {
    if (!id) return "#E2F0CB";
    try {
        const stored = JSON.parse(localStorage.getItem("classroomColors") || "{}");
        if (stored[id]) return stored[id];
        const color = AESTHETIC_COLORS[id.charCodeAt(id.length - 1) % AESTHETIC_COLORS.length];
        return color;
    } catch { return "#E2F0CB"; }
};

export default function ClassroomInfoModal({ isOpen, onClose, classroom, isTeacher }) {
    const [description, setDescription] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [fullData, setFullData] = useState(null);

    // Fetch full details when modal opens
    useEffect(() => {
        if (isOpen && classroom?._id) {
            fetchDetails();
        }
    }, [isOpen, classroom]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const token = await auth.currentUser.getIdToken();
            // Use the classroom ID (if it's a channel object from teacher view, it might be stored differently, 
            // but for now let's assume classroom._id is the Classroom ID. 
            // If teacher passes a Channel object, we might need classroom._id from that.)

            // SAFEGUARD: If 'classroom' is actually a Channel object (Teacher View), 
            // it won't have the new description field yet. 
            // However, we need the CLASSROOM ID. 
            // In Teacher View (Community.jsx), we passed 'activeTeacherClass'.
            // Is activeTeacherClass a Channel or a Classroom? 
            // In 'fetchChats', secondaryChats are Channels.
            // We need to ensure we are querying by the correct ID.

            const targetId = classroom._id;

            const { data } = await axios.get(`${server}/classroom/details/${targetId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setFullData(data);
            setDescription(data.description || "Welcome to the class group!");
        } catch (error) {
            console.error("Failed to fetch class details", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDescription = async () => {
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.put(`${server}/classroom/description`,
                { classroomId: classroom._id, description },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setIsEditing(false);
            // Update local state
            setFullData(prev => ({ ...prev, description }));
        } catch (error) {
            console.error("Failed to update description", error);
        }
    };

    if (!classroom) return null;

    const bgColor = getClassroomColor(classroom._id);

    // MERGE PARTICIPANTS: Combine teachers and students from the fetched data
    const getSubjectTeachers = () => {
        if (!fullData?.subjects) return [];
        const teacherMap = new Map();
        fullData.subjects.forEach(sub => {
            (sub.teacherIds || []).forEach(t => {
                if (t && t._id) teacherMap.set(t._id.toString(), t);
            });
        });
        return Array.from(teacherMap.values());
    };

    const participants = fullData
        ? [...getSubjectTeachers(), ...(fullData.studentIds || [])]
        : [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-md w-full bg-white !rounded-[30px] overflow-hidden">

            {/* --- HEADER --- */}
            <div className="relative">
                <div style={{ backgroundColor: bgColor }} className="h-32 w-full relative overflow-hidden transition-colors duration-500">
                    <div className="absolute top-[-20px] left-[-20px] w-32 h-32 bg-white opacity-30 rounded-full blur-xl"></div>
                    <div className="absolute bottom-[-10px] right-[-10px] w-24 h-24 bg-white opacity-40 rounded-full blur-xl"></div>
                </div>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                    <div className="p-1.5 bg-white rounded-full shadow-lg">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center border border-gray-100" style={{ backgroundColor: bgColor }}>
                            <img src={BookIcon} className="w-10 h-10 object-contain opacity-90" alt="Class Logo" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- TITLE --- */}
            <div className="pt-12 pb-6 px-6 text-center">
                <h2 className="text-xl font-black text-gray-800 tracking-tight leading-tight">
                    {fullData?.name || classroom.name}
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {classroom.metadata?.course || fullData?.metadata?.course || "Course"} • Sem {classroom.metadata?.semester || fullData?.metadata?.semester || "N/A"}
                </p>
            </div>

            {/* --- DESCRIPTION --- */}
            <div className="px-6 mb-6">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative group">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex justify-between items-center">
                        About Group
                        {isTeacher && !isEditing && (
                            <button onClick={() => setIsEditing(true)} className="text-blue-500 hover:text-blue-700">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                        )}
                    </h3>

                    {isEditing ? (
                        <div className="animate-in fade-in">
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/5 resize-none"
                                rows={3}
                                placeholder="Add a group description..."
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2">Cancel</button>
                                <button onClick={handleSaveDescription} className="text-xs bg-black text-white px-3 py-1 rounded-md font-bold">Save</button>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="min-h-[1.5em]">
                            <LoadingState size="xs" align="start" className="items-start" />
                        </div>
                    ) : (
                        <p className="text-xs text-gray-600 leading-relaxed font-medium min-h-[1.5em]">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            {/* --- PARTICIPANTS --- */}
            <div className="flex-1 overflow-y-auto px-6 mb-6 max-h-48 soft-scrollbar">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-3 sticky top-0 bg-white py-2 z-10">
                    Participants ({participants.length || 0})
                </h3>
                <div className="space-y-3 pb-2">
                    {loading ? (
                        <div className="py-6 flex items-center justify-center">
                            <LoadingState size="sm" />
                        </div>
                    ) : participants.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-2">No participants found.</p>
                    ) : (
                        participants.map((user, idx) => (
                            <UserListItem
                                key={user._id || idx}
                                user={user}
                                subText={user.role === 'teacher' ? 'Faculty' : 'Student'}
                                badgeText={user.role === 'teacher' ? 'Admin' : null}
                                badgeColor="green"
                            />
                        ))
                    )}
                </div>
            </div>

            {/* --- FOOTER --- */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>Created {classroom.createdAt ? new Date(classroom.createdAt).toLocaleDateString() : "Recently"}</span>
                <span>{participants.length} Members</span>
            </div>

        </Modal>
    );
}
