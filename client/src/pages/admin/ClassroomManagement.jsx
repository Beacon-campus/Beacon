import React, { useState, useEffect, useMemo } from "react";
import apiClient from "../../services/apiClient";
import toast from "react-hot-toast";

export default function ClassroomManagement() {
    const [classrooms, setClassrooms] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Accordion / Panel State
    const [expandedCourse, setExpandedCourse] = useState(null);
    const [expandedClassroom, setExpandedClassroom] = useState(null);

    // Filter & Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [selectedShifts, setSelectedShifts] = useState([]);
    const [selectedSemesters, setSelectedSemesters] = useState([]);
    const filterRef = React.useRef(null);

    // New Class Form Data
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddSingleModalOpen, setIsAddSingleModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        course: "",
        semester: 1,
        shift: "Morning",
    });

    // Action Modals
    const [subjectModal, setSubjectModal] = useState({ isOpen: false, classroomId: null, code: '', name: '' });
    const [teacherModal, setTeacherModal] = useState({ isOpen: false, classroomId: null, subjectId: null, selectedTeacherIds: [] });

    const fetchData = async () => {
        try {
            setLoading(true);

            const [clsRes, usersRes] = await Promise.all([
                apiClient.get(`/admin/classrooms`),
                apiClient.get(`/admin/users`)
            ]);

            setClassrooms(clsRes.data);
            setTeachers(usersRes.data.filter(u => u.role === "teacher"));
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Close filter dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilters(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Filter & Grouping Logic ---
    const groupedClassrooms = useMemo(() => {
        // 1. Filter Master List First
        const filtered = classrooms.filter(cls => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = cls.name.toLowerCase().includes(q) || (cls.course || "").toLowerCase().includes(q);

            const matchesShift = selectedShifts.length === 0 || selectedShifts.includes(cls.shift);
            const matchesSemester = selectedSemesters.length === 0 || selectedSemesters.includes(parseInt(cls.semester));

            return matchesSearch && matchesShift && matchesSemester;
        });

        const grouped = {};
        filtered.forEach(cls => {
            const c = cls.course || "General";
            const sh = cls.shift || "Standard";
            if (!grouped[c]) grouped[c] = {};
            if (!grouped[c][sh]) grouped[c][sh] = [];
            grouped[c][sh].push(cls);
        });

        // Sort inner semesters
        Object.keys(grouped).forEach(course => {
            Object.keys(grouped[course]).forEach(shift => {
                grouped[course][shift].sort((a, b) => parseInt(a.semester) - parseInt(b.semester));
            });
        });

        return grouped;
    }, [classrooms, searchQuery, selectedShifts, selectedSemesters]);

    // Handle toggling arrays
    const toggleArrayItem = (setter, item) => {
        setter(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };

    // --- API Handlers ---
    const handleCreateClassroom = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post(`/admin/classrooms/bulk`, { course: formData.course });
            toast.success("Network mapped completely!");
            fetchData();
            setIsAddModalOpen(false);
            setFormData({ name: "", course: "", semester: 1, shift: "Morning" });
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create network.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCourse = async (e, courseName) => {
        e.stopPropagation(); // Prevent the tile from triggering an open click
        if (!window.confirm(`Delete the entire "${courseName}" network? This destroys ALL 18 classrooms, subjects, channels and enrollments.`)) return;
        try {
            await apiClient.delete(`/admin/classrooms/course/${encodeURIComponent(courseName)}`);
            toast.success("Course network demolished.");
            if (expandedCourse === courseName) setExpandedCourse(null);
            if (classrooms.find(c => c._id === expandedClassroom)?.course === courseName) {
                setExpandedClassroom(null);
            }
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete course network.");
        }
    };

    const handleCreateSingleClassroom = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post(`/admin/classrooms`, formData);
            toast.success("Classroom generated!");
            fetchData();
            setIsAddSingleModalOpen(false);
            // Reset to defaults but keep the course context if they want to add another
            setFormData(prev => ({ name: "", course: prev.course, semester: 1, shift: "Morning" }));
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create classroom.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Kept for individual room deletes if needed, though replaced mostly by Bulk Course Delete
    const handleDeleteClassroom = async (id, name) => {
        if (!window.confirm(`Delete "${name}"? This removes all subjects, channels and enrollments.`)) return;
        try {
            await apiClient.delete(`/admin/classrooms/${id}`);
            toast.success("Classroom demolished.");
            if (expandedClassroom === id) setExpandedClassroom(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete classroom.");
        }
    };

    const handleAddSubject = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post(`/admin/classrooms/${subjectModal.classroomId}/subjects`,
                { code: subjectModal.code, name: subjectModal.name }
            );
            toast.success("Subject added!");
            setSubjectModal({ isOpen: false, classroomId: null, code: '', name: '' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to add subject");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssignTeachers = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.put(`/admin/classrooms/${teacherModal.classroomId}/subjects/${teacherModal.subjectId}/teachers`,
                { teacherIds: teacherModal.selectedTeacherIds }
            );
            toast.success("Teachers assigned to subject!");
            setTeacherModal({ isOpen: false, classroomId: null, subjectId: null, selectedTeacherIds: [] });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to assign teachers");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleTeacherSelection = (teacherId) => {
        setTeacherModal(prev => {
            const isSelected = prev.selectedTeacherIds.includes(teacherId);
            return {
                ...prev,
                selectedTeacherIds: isSelected
                    ? prev.selectedTeacherIds.filter(id => id !== teacherId)
                    : [...prev.selectedTeacherIds, teacherId]
            };
        });
    };

    // Helper Auto-Name logic
    const handleAutoName = (field, value) => {
        const updatedData = { ...formData, [field]: value };
        setFormData(updatedData);
        if (updatedData.course && updatedData.semester && updatedData.shift) {
            setFormData(prev => ({ ...prev, name: `${updatedData.course} - Sem ${updatedData.semester} - ${updatedData.shift}` }));
        }
    };

    return (
        <div className="h-full flex flex-col pt-3 bg-gray-50/30">
            {/* Header & Controls Area */}
            <div className="bg-white border-b border-gray-100 px-8 py-5 flex flex-col gap-5 shrink-0 z-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Classroom Network</h1>
                        <p className="text-sm font-medium text-gray-400 mt-0.5">Visually manage classes, mapped subjects, and teacher assignments</p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-black text-white font-bold rounded-xl shadow-[0_8px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M24 10h-10v-10h-4v10h-10v4h10v10h4v-10h10z" /></svg>
                        Create Network
                    </button>
                </div>

                {/* Control Bar: Search & Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 group w-full">
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="text"
                            placeholder="Search Course Nodes or Classrooms..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-black focus:bg-white transition-all shadow-sm"
                        />
                    </div>

                    {/* UNIFIED FILTER DROPDOWN */}
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-bold transition-all shadow-sm ${showFilters || selectedShifts.length > 0 || selectedSemesters.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                            Filters {(selectedShifts.length > 0 || selectedSemesters.length > 0) && <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-md ml-1">{selectedShifts.length + selectedSemesters.length}</span>}
                        </button>

                        {showFilters && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2">

                                <div className="mb-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Shift Filter</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {['Morning', 'Afternoon', 'Evening'].map(shift => (
                                            <label key={shift} className={`flex items-center duration-200 cursor-pointer px-2.5 py-1.5 rounded-lg border text-xs font-bold ${selectedShifts.includes(shift) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                <input type="checkbox" className="hidden" checked={selectedShifts.includes(shift)} onChange={() => toggleArrayItem(setSelectedShifts, shift)} />
                                                {shift}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Semester Filter</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[1, 2, 3, 4, 5, 6].map(sem => (
                                            <label key={sem} className={`flex items-center justify-center duration-200 cursor-pointer py-1.5 rounded-lg border text-xs font-bold ${selectedSemesters.includes(sem) ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                <input type="checkbox" className="hidden" checked={selectedSemesters.includes(sem)} onChange={() => toggleArrayItem(setSelectedSemesters, sem)} />
                                                S{sem}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {(selectedShifts.length > 0 || selectedSemesters.length > 0) && (
                                    <button onClick={() => { setSelectedShifts([]); setSelectedSemesters([]); }} className="w-full mt-4 text-xs font-bold text-gray-400 hover:text-gray-800 py-1 transition-colors">
                                        Clear All
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
            ) : Object.keys(groupedClassrooms).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <p className="font-semibold text-lg text-gray-700">No Target Classes Found</p>
                    <p className="text-sm mt-1">Adjust your filters or query to locate nodes.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto soft-scrollbar pr-2">

                    {/* COURSE TILES GRID */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 max-w-[1400px] mx-auto mb-8">
                        {Object.keys(groupedClassrooms).map(course => (
                            <div
                                key={course}
                                onClick={() => { setExpandedCourse(expandedCourse === course ? null : course); setExpandedClassroom(null); }}
                                className={`group relative rounded-3xl border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-center items-center p-8 text-center min-h-[180px] ${expandedCourse === course ? 'bg-indigo-600 border-indigo-700 shadow-xl shadow-indigo-200 text-white scale-[1.02]' : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-lg text-gray-800'}`}
                            >
                                {/* Delete Icon on Hover */}
                                <button
                                    onClick={(e) => handleDeleteCourse(e, course)}
                                    className={`absolute top-4 right-4 p-2 rounded-full transition-all duration-200 ${expandedCourse === course ? 'bg-indigo-500/50 hover:bg-red-500 text-white opacity-100' : 'bg-red-50 hover:bg-red-500 hover:text-white text-red-500 opacity-0 group-hover:opacity-100'}`}
                                    title="Delete entire Course Network"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>

                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl mb-4 transition-colors ${expandedCourse === course ? 'bg-white/20 text-white shadow-inner' : 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/30'}`}>
                                    {course.substring(0, 2).toUpperCase()}
                                </div>

                                <h2 className="text-xl font-black tracking-tight">{course}</h2>
                                <p className={`text-[10px] font-bold mt-1 uppercase tracking-widest ${expandedCourse === course ? 'text-indigo-200' : 'text-gray-400'}`}>Course Network</p>
                            </div>
                        ))}
                    </div>

                    {/* EXPANDED COURSE DETAILS */}
                    {expandedCourse && groupedClassrooms[expandedCourse] && (
                        <div className="bg-white rounded-3xl border border-gray-100/50 shadow-[0_12px_24px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-indigo-50/30 before:to-transparent before:-z-10 z-0 p-6 sm:p-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-top-4 duration-300">

                            <div className="flex items-center justify-between mb-8 border-b border-indigo-100/50 pb-4">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{expandedCourse} Structure</h2>
                                    <p className="text-sm font-bold text-indigo-500/80 uppercase tracking-widest leading-none mt-1">Filtered Classrooms</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setFormData({ name: `${expandedCourse} - Sem 1 - Morning`, course: expandedCourse, semester: 1, shift: "Morning" });
                                            setIsAddSingleModalOpen(true);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 shadow-sm"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                                        Add New
                                    </button>
                                    <button onClick={() => setExpandedCourse(null)} className="p-2 text-gray-400 hover:text-gray-800 bg-white rounded-full transition-colors shadow-sm border border-gray-100">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Shift Blocks */}
                            <div className="space-y-6">
                                {Object.keys(groupedClassrooms[expandedCourse]).map(shift => (
                                    <div key={shift} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">

                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                                            <h3 className="font-bold text-gray-700 uppercase tracking-widest text-sm">{shift}</h3>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                            {groupedClassrooms[expandedCourse][shift].map(cls => (
                                                <div
                                                    key={cls._id}
                                                    onClick={() => setExpandedClassroom(cls._id)}
                                                    className="group relative bg-gray-50/50 border border-gray-200/60 rounded-xl p-4 cursor-pointer hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200 overflow-hidden"
                                                >
                                                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-indigo-100/50 to-transparent -mr-2 -mt-2 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                                    <div className="relative z-10">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-black text-gray-800 tracking-tight text-xl">S{cls.semester}</span>
                                                        </div>

                                                        <div className="flex items-center justify-between mt-4">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 group-hover:text-indigo-500 transition-colors uppercase">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                                                                    {cls.subjects?.length || 0} Sub
                                                                </span>
                                                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 group-hover:text-emerald-500 transition-colors uppercase">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                                    {cls.studentCount} Stu
                                                                </span>
                                                            </div>
                                                            <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all -translate-x-2 group-hover:translate-x-0 cursor-pointer">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    )}
                </div>
            )}

            {/* LEVEL 4: CLASSROOM SUBJECT DASHBOARD MODAL/OVERLAY */}
            {expandedClassroom && (
                <div className="fixed inset-0 bg-black/60 z-50 flex justify-end animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                        {/* Dashboard Header */}
                        {(() => {
                            const c = classrooms.find(c => c._id === expandedClassroom);
                            if (!c) return null;
                            return (
                                <>
                                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                                        <div>
                                            <div className="flex gap-2 mb-1.5">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600">{c.course}</span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600">Sem {c.semester}</span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600">{c.shift}</span>
                                            </div>
                                            <h2 className="text-xl font-black text-gray-800">{c.name}</h2>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => handleDeleteClassroom(c._id, c.name)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete Classroom">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                            <button onClick={() => setExpandedClassroom(null)} className="text-gray-400 hover:text-gray-800 hover:bg-gray-100 p-2 rounded-full transition-colors">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Subjects Area */}
                                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-gray-800 tracking-wide text-sm uppercase">Subject Directory</h3>
                                            <button
                                                onClick={() => setSubjectModal({ isOpen: true, classroomId: c._id, code: '', name: '' })}
                                                className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                                Add Subject
                                            </button>
                                        </div>

                                        {(!c.subjects || c.subjects.length === 0) ? (
                                            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center border-dashed">
                                                <p className="text-gray-500 font-medium text-sm">No subjects mapped yet.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {c.subjects.map(sub => (
                                                    <div key={sub._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{sub.code}</span>
                                                                <h4 className="font-bold text-gray-800 text-base">{sub.name}</h4>
                                                            </div>
                                                            <button
                                                                onClick={() => setTeacherModal({
                                                                    isOpen: true,
                                                                    classroomId: c._id,
                                                                    subjectId: sub._id,
                                                                    selectedTeacherIds: sub.teacherIds.map(t => t._id || t)
                                                                })}
                                                                className="text-xs font-bold text-gray-500 hover:text-primary transition-colors flex items-center gap-1 border border-gray-200 px-2.5 py-1 rounded-md hover:border-primary hover:bg-primary/5"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                                                Assign Teachers
                                                            </button>
                                                        </div>

                                                        {/* Teacher Avatars / List */}
                                                        <div className="bg-gray-50 rounded-lg p-2 flex flex-wrap gap-2">
                                                            {sub.teacherIds.length === 0 ? (
                                                                <span className="text-xs font-medium text-gray-400 italic">No teachers assigned</span>
                                                            ) : (
                                                                sub.teacherIds.map(teacher => (
                                                                    <span key={teacher._id} className="bg-white border border-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                                                                        {teacher.profile?.name || teacher.profile?.displayName || teacher.email}
                                                                    </span>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}


            {/* --- ADD SUBJECT MODAL --- */}
            {subjectModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h2 className="font-bold text-gray-800">Add New Subject</h2>
                        </div>
                        <form onSubmit={handleAddSubject} className="p-5 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Subject Code</label>
                                <input required type="text" value={subjectModal.code} onChange={e => setSubjectModal({ ...subjectModal, code: e.target.value })} placeholder="Ex: BCA101" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Subject Name</label>
                                <input required type="text" value={subjectModal.name} onChange={e => setSubjectModal({ ...subjectModal, name: e.target.value })} placeholder="Ex: Web Development" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setSubjectModal({ isOpen: false, classroomId: null, code: '', name: '' })} className="px-4 py-1.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 text-sm font-bold text-white bg-primary hover:bg-black rounded-lg transition-all active:scale-95 disabled:opacity-50">Save Subject</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- ASSIGN TEACHERS MODAL --- */}
            {teacherModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                            <div>
                                <h2 className="font-bold text-gray-800">Assign Teachers</h2>
                                <p className="text-xs text-gray-500">Select educators for this subject</p>
                            </div>
                        </div>

                        <div className="p-2 overflow-y-auto flex-1">
                            {teachers.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500">No teachers found in system.</div>
                            ) : (
                                <div className="space-y-1">
                                    {teachers.map(teacher => {
                                        const isSelected = teacherModal.selectedTeacherIds.includes(teacher._id);
                                        return (
                                            <label key={teacher._id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${isSelected ? 'bg-indigo-50/50 border-indigo-200' : 'bg-transparent border-transparent hover:bg-gray-50'}`}>
                                                <input type="checkbox" checked={isSelected} onChange={() => toggleTeacherSelection(teacher._id)} className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                                                <div>
                                                    <p className={`text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>{teacher.displayName}</p>
                                                    <p className="text-xs font-medium text-gray-400">{teacher.email}</p>
                                                </div>
                                            </label>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2 shrink-0">
                            <button type="button" onClick={() => setTeacherModal({ isOpen: false, classroomId: null, subjectId: null, selectedTeacherIds: [] })} className="px-4 py-1.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleAssignTeachers} disabled={isSubmitting} className="px-5 py-1.5 text-sm font-bold text-white bg-primary hover:bg-black rounded-lg transition-all active:scale-95 disabled:opacity-50">
                                Update Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* CLASSROOM BUILD MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col">

                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                            <h2 className="text-lg font-bold text-gray-800">Create Network</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1.5 rounded-full transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto w-full">
                            <form id="create-class-form" onSubmit={handleCreateClassroom} className="space-y-4">

                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4">
                                    <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                                        This will automatically scaffold <strong className="font-black text-amber-900 border-b border-amber-900/30">18 classrooms</strong> (Semesters 1-6 across Morning, Afternoon, and Evening shifts) for the specified Course.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Course Target</label>
                                    <input required type="text" value={formData.course} onChange={(e) => setFormData({ ...formData, course: e.target.value.toUpperCase() })} placeholder="Ex: BBA" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-black focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all uppercase placeholder:font-normal" />
                                </div>

                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end shrink-0">
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                            <button type="submit" form="create-class-form" disabled={isSubmitting} className="px-6 py-2 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50">
                                {isSubmitting ? "Building Network..." : "Scaffold Network"}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* SINGLE CLASSROOM BUILD MODAL */}
            {isAddSingleModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col">

                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                            <h2 className="text-lg font-bold text-gray-800">Add Node to Network</h2>
                            <button onClick={() => setIsAddSingleModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1.5 rounded-full transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto w-full">
                            <form id="create-single-class-form" onSubmit={handleCreateSingleClassroom} className="space-y-4">

                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-2">
                                    <p className="text-xs font-semibold text-blue-800">
                                        You are deploying a single specific shifted classroom into the <strong>{formData.course}</strong> network. The backend name maps automatically based on options below.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Semester</label>
                                        <input required type="number" min="1" max="10" value={formData.semester} onChange={(e) => handleAutoName('semester', parseInt(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Shift</label>
                                        <select value={formData.shift} onChange={(e) => handleAutoName('shift', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer">
                                            <option value="Morning">Morning</option>
                                            <option value="Afternoon">Afternoon</option>
                                            <option value="Evening">Evening</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Generated Output Identity</label>
                                    <input disabled type="text" value={formData.name} className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 cursor-not-allowed" />
                                </div>

                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end shrink-0">
                            <button type="button" onClick={() => setIsAddSingleModalOpen(false)} className="px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                            <button type="submit" form="create-single-class-form" disabled={isSubmitting} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50">
                                {isSubmitting ? "Deploying..." : "Deploy Node"}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
