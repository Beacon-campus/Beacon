import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import apiClient from "../../services/apiClient";
import Modal from "../ui/Modal";
import { getAvatarUrl } from "../../utils/avatarUtils";

// Colors for Banner
const COLORS = {
    red: "bg-[#FFEDED]",
    orange: "bg-[#FFF5ED]",
    yellow: "bg-[#FFFFED]",
    green: "bg-[#EDFFED]",
    teal: "bg-[#EDFFFF]",
    blue: "bg-[#EDF5FF]",
    purple: "bg-[#F5EDFF]",
    pink: "bg-[#FFEDF5]",
    gray: "bg-[#F3F4F6]",
};

export default function AdminEditProfileModal({ isOpen, onClose }) {
    const { user, refreshUser } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

    const [tempData, setTempData] = useState({
        displayName: "Admin",
        profileImageId: 11,
        about: "",
        bannerColor: "blue",
    });

    // Sync state when modal opens
    useEffect(() => {
        if (isOpen && user) {
            setTempData({
                displayName: user.profile?.displayName || "Admin",
                profileImageId: user.profile?.avatar || 11,
                about: user.profile?.about || "",
                bannerColor: user.profile?.bannerColor || "blue",
            });
        }
    }, [isOpen, user]);

    // Avatars available for selection
    const availableAvatars = useMemo(() => {
        // Admin acts like a teacher or superuser. Let's provide a mix or 1-19
        return Array.from({ length: 19 }, (_, i) => i + 1);
    }, []);

    const handleNextAvatar = () => {
        const currentIndex = availableAvatars.indexOf(tempData.profileImageId);
        const nextIndex = (currentIndex + 1) % availableAvatars.length;
        setTempData((prev) => ({ ...prev, profileImageId: availableAvatars[nextIndex] }));
    };

    const handlePrevAvatar = () => {
        const currentIndex = availableAvatars.indexOf(tempData.profileImageId);
        const prevIndex = (currentIndex - 1 + availableAvatars.length) % availableAvatars.length;
        setTempData((prev) => ({ ...prev, profileImageId: availableAvatars[prevIndex] }));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const { data } = await apiClient.put("/update-profile", {
                displayName: tempData.displayName,
                avatarId: tempData.profileImageId,
                about: tempData.about,
                bannerColor: tempData.bannerColor,
            });

            if (data.success) {
                onClose();
                refreshUser(); // Trigger global refresh
            } else {
                console.error("Save failed:", data.message || "Unknown error");
                alert("Failed to save changes: " + (data.message || "Please try again."));
            }
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save changes. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-md h-auto p-8 block">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
                ✕
            </button>

            <h2 className="text-xl font-bold text-primary text-center mb-6">Customize Profile</h2>

            {/* Avatar Selection */}
            <div className="flex flex-col items-center mb-6">
                <label className="text-xs text-gray-400 uppercase font-semibold mb-3">
                    Choose Avatar
                </label>
                <div className="flex items-center gap-6">
                    <button
                        onClick={handlePrevAvatar}
                        className="p-2 rounded-full hover:bg-gray-100 border border-gray-200 text-gray-600 transition-colors"
                    >
                        ←
                    </button>
                    <div className="w-24 h-24 rounded-full border-4 border-green-500 overflow-hidden shadow-sm relative">
                        <img
                            src={getAvatarUrl(tempData.profileImageId)}
                            alt="Selected"
                            className="w-full h-full object-cover block"
                        />
                    </div>
                    <button
                        onClick={handleNextAvatar}
                        className="p-2 rounded-full hover:bg-gray-100 border border-gray-200 text-gray-600 transition-colors"
                    >
                        →
                    </button>
                </div>
            </div>

            {/* Display Name Input */}
            <div className="mb-8">
                <label className="block text-xs text-gray-400 uppercase font-semibold mb-2 ml-1">
                    Display Name
                </label>
                <input
                    type="text"
                    value={tempData.displayName}
                    onChange={(e) => setTempData({ ...tempData, displayName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-primary font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter public display name"
                />
            </div>

            {/* About Me Input */}
            <div className="mb-8">
                <label className="block text-xs text-gray-400 uppercase font-semibold mb-2 ml-1">
                    About Me (Max 50 words)
                </label>
                <textarea
                    value={tempData.about}
                    onChange={(e) => setTempData({ ...tempData, about: e.target.value })}
                    maxLength={300}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none text-sm"
                    placeholder="Tell us a little about yourself..."
                />
            </div>

            {/* Banner Color Selection */}
            <div className="mb-8">
                <label className="block text-xs text-gray-400 uppercase font-semibold mb-3 ml-1">
                    Card Banner Tint
                </label>
                <div className="flex flex-wrap gap-3">
                    {Object.keys(COLORS).map((colorKey) => (
                        <button
                            key={colorKey}
                            onClick={() => setTempData({ ...tempData, bannerColor: colorKey })}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${COLORS[colorKey]} 
                ${tempData.bannerColor === colorKey
                                    ? "border-gray-800 scale-110 shadow-md"
                                    : "border-gray-200 hover:scale-105"
                                }`}
                            title={colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}
                        />
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-200"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="flex-1 py-3 bg-primary text-white font-medium rounded-xl hover:bg-black transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </Modal>
    );
}
