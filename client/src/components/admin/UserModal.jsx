import React, { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import toast from "react-hot-toast";

/**
 * Reusable Modal for both Creating and Editing Users.
 * 
 * Props:
 * - isOpen: boolean to show/hide modal
 * - onClose: function to trigger close
 * - mode: 'create' | 'edit'
 * - user: user object (only required if mode === 'edit')
 * - onRefresh: function to refresh the parent list after success
 */
export default function UserModal({ isOpen, onClose, mode, user, onRefresh }) {
    const isEdit = mode === "edit";
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "", // Only used for create
        role: "student",
        regno: "",
        course: "", // Used for edit academic info
        semester: 0, // Used for edit academic info
        department: "IT",
    });

    // Populate data when modal opens
    useEffect(() => {
        if (isOpen) {
            if (isEdit && user) {
                setFormData({
                    name: user.displayName || "",
                    email: user.email || "",
                    role: user.role || "student",
                    regno: user.regno || "",
                    course: user.course || "",
                    semester: user.semester || 0,
                    department: user.department || "IT",
                    password: "", // We don't edit password here
                });
            } else {
                // Reset for create
                setFormData({
                    name: "",
                    email: "",
                    password: "",
                    role: "student",
                    regno: "",
                    course: "",
                    semester: 0,
                    department: "IT",
                });
            }
        }
    }, [isOpen, isEdit, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (isEdit) {
                // Edit API Call
                await apiClient.put(`/admin/users/${user._id}`, formData);
                toast.success("User updated successfully!");
            } else {
                // Create API Call
                await apiClient.post(`/admin/users`, formData);
                toast.success("User created successfully!");
            }
            onRefresh();
            onClose();
        } catch (error) {
            console.error(`Error ${isEdit ? "updating" : "creating"} user:`, error);
            toast.error(error.response?.data?.error || `Failed to ${isEdit ? "update" : "create"} user`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!isEdit || !user) return;
        try {
            await apiClient.put(
                `/admin/users/${user._id}/status`,
                { disabled: !user.disabled }
            );
            toast.success(`User ${!user.disabled ? "disabled" : "enabled"} successfully!`);
            onRefresh();
            onClose();
        } catch (error) {
            console.error("Failed to toggle status:", error);
            toast.error(error.response?.data?.error || "Failed to update status");
        }
    };

    const handleDelete = async () => {
        if (!isEdit || !user) return;
        if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${user.displayName}? This action cannot be undone.`)) {
            return;
        }

        try {
            await apiClient.delete(`/admin/users/${user._id}`);
            toast.success("User deleted permanently.");
            onRefresh();
            onClose();
        } catch (error) {
            console.error("Failed to delete user:", error);
            toast.error(error.response?.data?.error || "Failed to delete user");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">

                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                    <h2 className="text-lg font-bold text-gray-800">
                        {isEdit ? "Manage User" : "Create New User"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1.5 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form Body - Scrollable */}
                <div className="flex-1 overflow-y-auto soft-scrollbar pr-2">
                    <form id="user-form" onSubmit={handleSubmit} className="space-y-4">

                        {/* Status Banner (Edit Only) */}
                        {isEdit && user && (
                            <div className="flex flex-col gap-2 mb-4">
                                <div className={`p-3 rounded-lg border flex items-center gap-3 ${user.disabled ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ${user.disabled ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`}></div>
                                    <span className={`text-sm font-bold ${user.disabled ? 'text-red-700' : 'text-green-700'}`}>
                                        Account Status: {user.disabled ? 'Disabled' : 'Active'}
                                    </span>
                                </div>
                                {!user.ispasswordreset && user.temppassword && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                                        <svg className="w-5 h-5 text-yellow-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-widest leading-tight mb-0.5">Temporary Password</span>
                                            <span className="text-sm font-mono text-yellow-800 font-bold leading-none">{user.temppassword}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Name & Role */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
                                    Full Name
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                            <div className="w-1/3">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
                                    Role
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                                >
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        {/* Email (Edit Only) & Reg No */}
                        <div className="flex gap-4">
                            {isEdit && (
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
                                        Email Address
                                    </label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    />
                                </div>
                            )}
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
                                    Reg / Roll No
                                </label>
                                <input
                                    type="text"
                                    placeholder="STU001"
                                    required={!isEdit}
                                    value={formData.regno}
                                    onChange={(e) => setFormData({ ...formData, regno: e.target.value.toUpperCase() })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                                />
                            </div>
                        </div>

                        {/* STUDENT View: Course + Semester */}
                        {formData.role === "student" && (
                            <div className="flex gap-4 pt-2">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Course</label>
                                    <input
                                        type="text"
                                        value={formData.course}
                                        onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    />
                                </div>
                                {isEdit && (
                                    <div className="w-1/3">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Semester</label>
                                        <input
                                            type="number"
                                            min="1" max="10"
                                            value={formData.semester}
                                            onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TEACHER View: Department + Subjects Viewer */}
                        {formData.role === "teacher" && (
                            <div className="flex gap-4 pt-2">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Department</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    />
                                </div>
                                {isEdit && user?.subjects?.length > 0 && (
                                    <div className="w-1/3">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Subjects</label>
                                        <div className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 cursor-not-allowed">
                                            {user.subjects.length} Assigned
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Create Specific: Auto Generation Banner */}
                        {!isEdit && (
                            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl mt-4">
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    <div>
                                        <h4 className="text-sm font-bold text-indigo-800">Auto-Generated Credentials</h4>
                                        <p className="text-xs font-semibold text-indigo-600/80 mt-0.5">Email and a temporary password will be securely mapped to the new Reg/Roll number automatically on creation.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Edit Specific: Destructive Actions */}
                    {isEdit && user && (
                        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Danger Zone</h3>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleToggleStatus}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${user.disabled
                                        ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                                        : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
                                        }`}
                                >
                                    {user.disabled ? 'Re-Enable Account' : 'Disable Account'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 transition-all flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Delete Permanently
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="user-form"
                        disabled={isSubmitting}
                        className="px-6 py-2 text-sm font-bold text-white bg-primary hover:bg-black rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? "Saving..." : (isEdit ? "Save Changes" : "Create User")}
                    </button>
                </div>
            </div>
        </div>
    );
}
