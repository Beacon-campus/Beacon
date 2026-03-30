import React, { useState, useEffect, useMemo } from "react";
import apiClient from "../../services/apiClient";
import toast from "react-hot-toast";
import { auth } from "../../firebase/firebase";
import { getOrFetchPageCache } from "../../services/pageCache.service";

import UserModal from "../../components/admin/UserModal";
import LoadingState from "../../components/ui/LoadingState";

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState("student"); // student | teacher | admin
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCourse, setFilterCourse] = useState("All");
    const [sortBy, setSortBy] = useState("recent"); // recent | oldest

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    // Unified Modal State
    const [modalState, setModalState] = useState({
        isOpen: false,
        mode: "create", // 'create' | 'edit'
        user: null,
    });

    const fetchUsers = async (force = false) => {
        try {
            setLoading(true);
            const userKey = auth.currentUser?.uid || "guest";
            const data = await getOrFetchPageCache(
                "admin:users",
                userKey,
                async () => {
                    const response = await apiClient.get(`/admin/users`);
                    return response.data || [];
                },
                { force, ttlMs: 120_000 }
            );
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Compute unique courses for the dropdown
    const availableCourses = useMemo(() => {
        const courses = users.filter(u => u.course && u.course !== "N/A").map(u => u.course);
        return ["All", ...new Set(courses)];
    }, [users]);

    // --- Filter & Sort Logic ---
    const filteredUsers = useMemo(() => {
        let result = users.filter(user => {
            // 1. Role Filter
            if (user.role !== activeTab) return false;

            // 2. Course Filter
            if (filterCourse !== "All" && user.course !== filterCourse) return false;

            // 3. Search Filter
            const search = searchQuery.toLowerCase();
            const matchName = user.displayName?.toLowerCase().includes(search);
            const matchEmail = user.email?.toLowerCase().includes(search);
            const matchRegno = user.regno?.toLowerCase().includes(search);

            return matchName || matchEmail || matchRegno;
        });

        // 4. Sort
        result.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return sortBy === "recent" ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [users, activeTab, searchQuery, filterCourse, sortBy]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery, filterCourse, sortBy]);

    // --- Pagination Logic ---
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
    const paginatedUsers = useMemo(() => {
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredUsers.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    }, [filteredUsers, currentPage]);


    return (
        <div className="h-full flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header Area */}
            <div className="px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight">User Management</h1>
                    <p className="text-sm font-medium text-gray-400 mt-1">Manage students, teachers, and admins</p>
                </div>
                <button
                    onClick={() => setModalState({ isOpen: true, mode: "create", user: null })}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0F172A] text-white font-bold rounded-xl shadow-md hover:bg-[#1e293b] transition-all active:scale-95 whitespace-nowrap"
                >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M24 10h-10v-10h-4v10h-10v4h10v10h4v-10h10z" /></svg>
                    Add New User
                </button>
            </div>

            {/* Controls Area: Tabs & Advanced Filters */}
            <div className="px-8 py-5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/30">

                {/* Stylish Tabs */}
                <div className="flex items-center gap-2 w-full xl:w-auto">
                    {["student", "teacher", "admin"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setFilterCourse("All"); // Reset course filter on tab change
                            }}
                            className={`flex-1 xl:flex-none capitalize px-5 py-2 rounded-xl text-sm font-bold border transition-all ${activeTab === tab
                                ? "bg-[#0F172A] border-[#0F172A] text-white shadow-md shadow-[#0F172A]/20"
                                : "bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                        >
                            {tab}s
                        </button>
                    ))}
                </div>

                {/* Filters Group */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">

                    {/* Status/Sort Filter */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm appearance-none outline-none"
                    >
                        <option value="recent">Recently Added</option>
                        <option value="oldest">Oldest First</option>
                    </select>

                    {/* Course Filter (Only useful if not admin) */}
                    {activeTab !== "admin" && (
                        <select
                            value={filterCourse}
                            onChange={(e) => setFilterCourse(e.target.value)}
                            className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm appearance-none outline-none max-w-[200px]"
                        >
                            {availableCourses.map(c => (
                                <option key={c} value={c}>{c === "All" ? "All Courses/Depts" : c}</option>
                            ))}
                        </select>
                    )}

                    {/* Search Bar */}
                    <div className="relative w-full sm:w-64 group shrink-0">
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:font-normal shadow-sm"
                        />
                    </div>
                </div>

            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <LoadingState size="sm" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <p className="font-semibold text-lg">No users found</p>
                        <p className="text-sm">Try adjusting your filters or search criteria</p>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="sticky top-0 bg-white shadow-[0_1px_0_rgba(229,231,235,1)] z-10">
                                <tr>
                                    <th className="px-8 py-4 text-[10px] font-black tracking-widest text-gray-400 uppercase">Register No.</th>
                                    <th className="px-4 py-4 text-[10px] font-black tracking-widest text-gray-400 uppercase">Name</th>
                                    {activeTab === "student" && (
                                        <th className="px-4 py-4 text-[10px] font-black tracking-widest text-gray-400 uppercase">Semester</th>
                                    )}
                                    <th className="px-4 py-4 text-[10px] font-black tracking-widest text-gray-400 uppercase">Status</th>
                                    <th className="px-8 py-4 text-[10px] font-black tracking-widest text-gray-400 uppercase text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedUsers.map((u) => (
                                    <tr key={u._id} className="hover:bg-gray-50/80 transition-colors group">

                                        {/* Register No. */}
                                        <td className="px-8 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-gray-600 tracking-wide">
                                                {u.regno}
                                            </span>
                                        </td>

                                        {/* Name & Email & Temp Pass Context */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-bold text-gray-800">{u.displayName}</span>
                                                <span className="text-xs font-medium text-gray-400">{u.email}</span>
                                            </div>
                                        </td>

                                        {/* Semester / Department */}
                                        {activeTab === "student" && (
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-600">
                                                        {u.role === 'student' ? (u.semester ? `Sem ${u.semester}` : 'N/A') : 'N/A'}
                                                    </span>
                                                    {/* Optionally show course/department below it if not 'All' */}
                                                    <span className="text-xs font-medium text-gray-400 truncate max-w-[150px]">
                                                        {u.course || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                        )}

                                        {/* Status */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${u.disabled ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
                                                <span className={`text-xs font-bold ${u.disabled ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {u.disabled ? 'Disabled' : 'Active'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Action */}
                                        <td className="px-8 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => setModalState({ isOpen: true, mode: "edit", user: u })}
                                                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-primary shadow-sm active:scale-95"
                                            >
                                                Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer Info & Pagination */}
            <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-gray-500">
                <span>Showing {paginatedUsers.length} item(s) • Page {currentPage} of {totalPages}</span>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                    >
                        Previous
                    </button>
                    <span className="font-bold text-gray-700 mx-2">{currentPage}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Unified User Modal */}
            <UserModal
                isOpen={modalState.isOpen}
                mode={modalState.mode}
                user={modalState.user}
                onClose={() => setModalState({ ...modalState, isOpen: false })}
                onRefresh={() => fetchUsers(true)}
            />

        </div>
    );
}
