import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import apiClient from "../services/apiClient";
import ChangePasswordModal from "./ChangePasswordModal";
import Modal from "./ui/Modal";
import ProfileCard from "./ProfileCard"; // Import ProfileCard

// Helper to resolve profile images
const getAvatarUrl = (id) => {
  if (!id) return null;
  return new URL(`../assets/profile/${id}.png`, import.meta.url).href;
};

export default function ProfileLayout() {
  const { user, refreshUser } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false); // Preview Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Theme State ---
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('app-theme') || '#000000');

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', currentTheme);
    localStorage.setItem('app-theme', currentTheme);
  }, [currentTheme]);

  // --- Initialize State from MongoDB Data ---
  // We default to the data inside user.profile coming from the backend
  const [profileData, setProfileData] = useState({
    displayName: user?.profile?.displayName || "Student",
    profileImageId: user?.profile?.avatar || (user?.role === 'teacher' ? 1 : 11),
    about: user?.profile?.about || "",
    bannerColor: user?.profile?.bannerColor || "blue" // Default blue
  });
  const [tempData, setTempData] = useState(profileData);

  // Sync state if user data updates (e.g. after refresh or initial load)
  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.profile?.displayName || "Student",
        profileImageId: user.profile?.avatar || (user.role === 'teacher' ? 1 : 11),
        about: user.profile?.about || "",
        bannerColor: user.profile?.bannerColor || "blue"
      });
    }
  }, [user]);

  // Reset temp data when modal opens
  useEffect(() => {
    if (isEditModalOpen) {
      setTempData(profileData);
    }
  }, [isEditModalOpen, profileData]);

  // Color Palette (from NoteCard)
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


  // --- Sections with IDs ---
  const sections = [
    { key: "guidelines", label: "Guidelines" },
    { key: "security", label: "Security" }, // Added Security
    { key: "open", label: "Open Source and Attribution" },
    { key: "backup", label: "Backup and download" },
    { key: "credits", label: "Credits" },
  ];

  const availableAvatars = useMemo(() => {
    if (!user) return [];
    if (user.role === 'teacher') {
      return Array.from({ length: 10 }, (_, i) => i + 1);
    } else {
      return Array.from({ length: 9 }, (_, i) => i + 11);
    }
  }, [user]);

  if (!user) return null;

  const handleNextAvatar = () => {
    const currentIndex = availableAvatars.indexOf(tempData.profileImageId);
    const nextIndex = (currentIndex + 1) % availableAvatars.length;
    setTempData(prev => ({ ...prev, profileImageId: availableAvatars[nextIndex] }));
  };

  const handlePrevAvatar = () => {
    const currentIndex = availableAvatars.indexOf(tempData.profileImageId);
    const prevIndex = (currentIndex - 1 + availableAvatars.length) % availableAvatars.length;
    setTempData(prev => ({ ...prev, profileImageId: availableAvatars[prevIndex] }));
  };

  // --- SAVE TO BACKEND ---
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const { data } = await apiClient.put("/update-profile", {
        displayName: tempData.displayName,
        avatarId: tempData.profileImageId,
        about: tempData.about,
        bannerColor: tempData.bannerColor
      });

      if (data.success) {
        setProfileData({
          displayName: data.displayName,
          profileImageId: data.avatar,
          about: data.about,
          bannerColor: data.bannerColor
        });
        setIsEditModalOpen(false);
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

  const renderIcon = (key, isActive) => {
    const className = `w-5 h-5 transition-all duration-200 fill-current ${isActive ? "opacity-100" : "group-hover:opacity-100"}`;

    switch (key) {
      case "guidelines":
        return (
          <svg viewBox="0 0 24 24" className={className}>
            <path d="m5,17.974h17v1c0,2.761-2.239,5-5,5H5c-1.657,0-3-1.343-3-3s1.343-3,3-3Zm0-2h1V.074C3.672.55,2,2.598,2,4.974v12.025c.699-.527,1.525-.86,2.395-.964.199-.041.402-.061.605-.061ZM22,4.974v11h-14V-.026h9c2.761,0,5,2.239,5,5Zm-5.977,6.026l1.293-1.293c.391-.391.391-1.023,0-1.414s-1.023-.391-1.414,0l-1.293,1.293-1.293-1.293c-.391-.391-1.023-.391-1.414,0s-.391,1.023,0,1.414l1.293,1.293-1.293,1.293c-.391.391-.391,1.023,0,1.414.195.195.451.293.707.293s.512-.098.707-.293l1.293-1.293,1.293,1.293c.195.195.451.293.707.293s.512-.098.707-.293c.391-.391.391-1.023,0-1.414l-1.293-1.293Zm2.192-8.699c-.394-.403-1.042-.401-1.433.004l-2.22,2.202-1.138-1.183c-.392-.414-1.05-.417-1.445-.006-.37.384-.372.992-.006,1.379l1.131,1.175c.787.832,2.109.839,2.905.015l2.211-2.193c.376-.389.374-1.007-.004-1.394Z" />
          </svg>
        );
      case "themes":
        return (
          <svg viewBox="0 0 24 24" className={className}>
            <path d="M20,3c0-1.654-1.346-3-3-3H3C1.346,0,0,1.346,0,3v2c0,1.654,1.346,3,3,3h14c1.654,0,3-1.346,3-3,1.103,0,2,.897,2,2v1c0,1.103-.897,2-2,2h-7c-2.206,0-4,1.794-4,4v.184c-1.161,.414-2,1.514-2,2.816v4c0,1.654,1.346,3,3,3s3-1.346,3-3v-4c0-1.302-.839-2.402-2-2.816v-.184c0-1.103,.897-2,2-2h7c2.206,0,4-1.794,4-4v-1c0-2.206-1.794-4-4-4Z" />
          </svg>
        );
      case "security":
        return (
          <svg viewBox="0 0 512 512" className={className}>
            <path d="M405.333,179.712v-30.379C405.333,66.859,338.475,0,256,0S106.667,66.859,106.667,149.333v30.379   c-38.826,16.945-63.944,55.259-64,97.621v128C42.737,464.214,90.452,511.93,149.333,512h213.333   c58.881-0.07,106.596-47.786,106.667-106.667v-128C469.278,234.971,444.159,196.657,405.333,179.712z M277.333,362.667   c0,11.782-9.551,21.333-21.333,21.333c-11.782,0-21.333-9.551-21.333-21.333V320c0-11.782,9.551-21.333,21.333-21.333   c11.782,0,21.333,9.551,21.333,21.333V362.667z M362.667,170.667H149.333v-21.333c0-58.91,47.756-106.667,106.667-106.667   s106.667,47.756,106.667,106.667V170.667z" />
          </svg>
        );
      case "open":
        return (
          <svg viewBox="0 0 24 24" className={className}>
            <path d="m18.5 1h-13c-3.033 0-5.5 2.467-5.5 5.5v11c0 3.032 2.468 5.5 5.5 5.5h13c3.032 0 5.5-2.468 5.5-5.5v-11c0-3.033-2.468-5.5-5.5-5.5zm-9 2c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5.672-1.5 1.5-1.5zm-5 0c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5.672-1.5 1.5-1.5zm16.5 14.5c0 1.379-1.121 2.5-2.5 2.5h-13c-1.379 0-2.5-1.121-2.5-2.5v-9.5h18zm-14.176-1.489c-.539-.537-.824-1.225-.824-1.956s.285-1.419.803-1.936l1.68-1.68c.586-.586 1.535-.586 2.121 0s.586 1.535 0 2.121l-1.49 1.49 1.425 1.367c.599.573.618 1.522.044 2.12-.573.599-1.525.617-2.12.044l-1.638-1.571zm6.572-3.45c-.586-.586-.586-1.535 0-2.121s1.535-.586 2.121 0l1.681 1.681c.517.516.802 1.203.802 1.935s-.285 1.419-.803 1.936l-1.659 1.592c-.595.573-1.548.555-2.12-.044-.574-.598-.555-1.547.044-2.12l1.425-1.367-1.49-1.49z" />
          </svg>
        );
      case "backup":
        return (
          <svg viewBox="0 0 24 24" className={className}>
            <path d="M2.849,23.55a2.954,2.954,0,0,0,3.266-.644L12,17.053l5.885,5.853a2.956,2.956,0,0,0,2.1.881,3.05,3.05,0,0,0,1.17-.237A2.953,2.953,0,0,0,23,20.779V5a5.006,5.006,0,0,0-5-5H6A5.006,5.006,0,0,0,1,5V20.779A2.953,2.953,0,0,0,2.849,23.55Z" />
          </svg>
        );
      case "credits":
        return (
          <svg viewBox="0 0 24 24" className={className}>
            <path d="M12,24A12,12,0,1,0,0,12,12.013,12.013,0,0,0,12,24ZM12,5a1.5,1.5,0,1,1-1.5,1.5A1.5,1.5,0,0,1,12,5Zm-1,5h1a2,2,0,0,1,2,2v6a1,1,0,0,1-2,0V12H11a1,1,0,0,1,0-2Z" />
          </svg>
        );
      default:
        return null;
    }
  };


  // Colors for Banner (Synced with ProfileCard)
  const BANNER_COLORS = {
    default: "from-blue-300 to-white",
    red: "from-red-300 to-white",
    orange: "from-orange-300 to-white",
    yellow: "from-yellow-300 to-white",
    green: "from-green-300 to-white",
    teal: "from-teal-300 to-white",
    blue: "from-blue-300 to-white",
    purple: "from-purple-300 to-white",
    pink: "from-pink-300 to-white",
    gray: "from-gray-300 to-white",
  };

  const bannerGradient = BANNER_COLORS[profileData.bannerColor] || BANNER_COLORS.default;

  return (
    <div className="w-full h-full p-6">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="flex gap-6 h-full w-full items-stretch">

        {/* ================= LEFT PANEL ================= */}
        <div className="flex-1 border border-gray-200 rounded-2xl bg-white shadow-sm flex flex-col overflow-hidden relative">

          {activeSection === "profile" && (
            <div className="relative h-full overflow-y-auto custom-scrollbar bg-gray-50/30">

              {/* Decorative Header Banner */}
              <div className={`h-40 bg-gradient-to-r ${bannerGradient} relative shrink-0 transition-colors duration-500`}>
                <div className="absolute inset-0 backdrop-blur-[2px] opacity-20"></div> {/* Optional subtle frost for depth */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="group flex items-center gap-1.5 px-3 py-1.5 bg-white/50 backdrop-blur-md border border-white/30 shadow-sm rounded-full text-xs font-semibold text-gray-800 hover:text-blue-700 hover:bg-white/60 transition-all hover:shadow-md"
                  >
                    <svg className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Edit
                  </button>
                  <button
                    onClick={() => setIsPreviewModalOpen(true)}
                    className="group flex items-center gap-1.5 px-3 py-1.5 bg-white/50 backdrop-blur-md border border-white/30 shadow-sm rounded-full text-xs font-semibold text-gray-800 hover:text-purple-700 hover:bg-white/60 transition-all hover:shadow-md"
                  >
                    <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Preview
                  </button>
                </div>
              </div>

              <div className="px-8 pb-8 -mt-16 relative z-10">

                {/* Header Row */}
                <div className="flex items-end gap-6 mb-8">
                  {/* Large Avatar Circle (No Box) */}
                  <div className="w-36 h-36 rounded-full border-4 border-white shadow-lg overflow-hidden shrink-0 bg-gray-100">
                    <img
                      src={getAvatarUrl(profileData.profileImageId)}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="pb-2 min-w-0">
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight truncate leading-tight">
                      {profileData.displayName || "Student"}
                    </h1>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <span className="truncate">{user.profile?.name || "Official Name"}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className="uppercase text-xs tracking-wider font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{user.role}</span>
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* About Me Card */}
                  <div className="md:col-span-2 group bg-white rounded-2xl p-5 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.05)] border border-gray-100 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-orange-50 text-orange-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">About Me</h3>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium pl-1">
                      {profileData.about || <span className="text-gray-400 italic">No description provided.</span>}
                    </p>
                  </div>

                  {/* ID Card */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md group">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0h4" /></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Registration ID</p>
                      <p className="text-sm font-bold text-gray-800 font-mono truncate">{user.regno || user.profile?.regno || "N/A"}</p>
                    </div>
                  </div>

                  {/* Email Card */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md group">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Contact</p>
                      <p className="text-sm font-semibold text-gray-700 truncate" title={user.email}>{user.email}</p>
                    </div>
                  </div>

                  {/* Academic Info Row */}
                  <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">

                    {/* Course */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-blue-100 block group relative overflow-hidden">
                      <div className="absolute -right-2 -top-2 w-16 h-16 bg-blue-50 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
                      <div className="flex items-center gap-2 mb-2 relative z-10">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                        </svg>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.role === 'teacher' ? 'Dept' : 'Course'}</span>
                      </div>
                      <span className="text-lg font-black text-gray-800 relative z-10 block truncate pr-2">{user.role === 'teacher' ? (user.profile?.department || "N/A") : (user.profile?.course || "N/A")}</span>
                    </div>

                    {/* Semester */}
                    {user.role === 'student' && (
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-pink-100 block group relative overflow-hidden">
                        <div className="absolute -right-2 -top-2 w-16 h-16 bg-pink-50 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
                        <div className="flex items-center gap-2 mb-2 relative z-10">
                          <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                          </svg>
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Semester</span>
                        </div>
                        <span className="text-lg font-black text-gray-800 relative z-10 block pl-1">{user.profile?.semester || "-"}</span>
                      </div>
                    )}

                    {/* Shift */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-amber-100 block group relative overflow-hidden">
                      <div className="absolute -right-2 -top-2 w-16 h-16 bg-amber-50 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
                      <div className="flex items-center gap-2 mb-2 relative z-10">
                        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shift</span>
                      </div>
                      <span className="text-lg font-black text-gray-800 truncate relative z-10 block pl-1">{user.profile?.shift || "N/A"}</span>
                    </div>

                  </div>

                </div>
              </div>

            </div>
          )}



          {/* ================= SECTION CONTENT (Guidelines, Credits, etc.) ================= */}
          {activeSection !== "profile" && (
            <div className="flex flex-col h-full p-6">
              <div className="mb-4 shrink-0 border-b pb-4">

                {/* Go Back Button */}
                <button
                  onClick={() => setActiveSection("profile")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all font-medium mb-4 group w-fit"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current group-hover:-translate-x-1 transition-transform">
                    <path d="M10,22.03c-.77,0-1.51-.3-2.09-.88L1.18,14.82c-1.57-1.57-1.57-4.09-.02-5.64,0,0,.01-.01,.02-.02L7.93,2.81c.84-.85,2.09-1.1,3.22-.63s1.84,1.52,1.85,2.74v2.06h7.03c2.19,0,3.97,1.8,3.97,4.01v1.98c0,2.21-1.78,4.01-3.97,4.01h-7.03v2.06c0,1.23-.71,2.28-1.85,2.75-.38,.16-.77,.23-1.15,.23Z" />
                  </svg>
                  <span className="text-sm">Go back</span>
                </button>

                <h1 className="text-2xl font-bold text-primary">{sections.find((s) => s.key === activeSection)?.label}</h1>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {/* === CONTENT SWITCHER === */}
                {activeSection === "guidelines" ? (
                  <div className="space-y-6 text-gray-700 text-sm leading-7">
                    <p className="font-medium">
                      These guidelines define acceptable usage, responsibilities,
                      and limitations of the platform.
                    </p>
                    <Section title="General Rules" items={["Accounts are personal.", "Access is role-based.", "Activity is logged."]} />
                    <Section title="Home Rules" items={["Dashboard is auto-generated.", "To-do lists are private."]} />
                    <Section title="AI Rules" items={["AI is for assistance only.", "Check generated content."]} />
                    <Section title="Privacy" items={["Data is secured.", "Do not share passwords."]} />
                  </div>
                ) : activeSection === "credits" ? (
                  <div className="text-gray-700">
                    <p className="mb-4">Developed by:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Charan R</li>
                      <li>Denzil Deepak A</li>
                      <li>Sahil Saini</li>
                      <li>Duke Christy D</li>
                    </ul>
                  </div>
                ) : activeSection === "security" ? (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-lg font-bold text-primary mb-4">Password & Authentication</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-700">Change Password</p>
                          <p className="text-sm text-gray-500">Update your password to keep your account secure.</p>
                        </div>
                        <button
                          onClick={() => setIsPasswordModalOpen(true)}
                          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-black transition-colors shadow-md"
                        >
                          Change Password
                        </button>
                      </div>
                    </div>
                  </div>

                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 italic">
                    Content for {activeSection} coming soon.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT PANEL (Navigation with Icons) ================= */}
        <div className="w-1/3 max-w-xs p-4 h-full overflow-y-auto custom-scrollbar">
          <div className="border border-gray-200 rounded-2xl bg-white shadow-sm flex flex-col overflow-hidden">
            {sections.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`w-full flex items-center gap-3 py-4 px-5 text-sm font-medium transition-all duration-200 text-left group
                  ${activeSection === item.key 
                    ? "bg-green-50 text-green-700 border-l-4 border-l-green-500" 
                    : "bg-white text-gray-500 hover:bg-gray-50/50 hover:text-gray-800 border-l-4 border-l-transparent"}
                  border-b border-black/5 last:border-b-0
                `}
              >
                {renderIcon(item.key, activeSection === item.key)}
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div >

      {/* ================= EDIT MODAL ================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        className="max-w-md h-auto p-8 block"
      >
        <button
          onClick={() => setIsEditModalOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-primary text-center mb-6">Customize Profile</h2>

        {/* Avatar Selection */}
        <div className="flex flex-col items-center mb-6">
          <label className="text-xs text-gray-400 uppercase font-semibold mb-3">Choose Avatar</label>
          <div className="flex items-center gap-6">
            <button onClick={handlePrevAvatar} className="p-2 rounded-full hover:bg-gray-100 border border-gray-200 text-gray-600 transition-colors">←</button>
            <div className="w-24 h-24 rounded-full border-4 border-green-500 overflow-hidden shadow-sm relative">
              <img src={getAvatarUrl(tempData.profileImageId)} alt="Selected" className="w-full h-full object-cover block" />
            </div>
            <button onClick={handleNextAvatar} className="p-2 rounded-full hover:bg-gray-100 border border-gray-200 text-gray-600 transition-colors">→</button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Avatar {availableAvatars.indexOf(tempData.profileImageId) + 1} of {availableAvatars.length}</p>
        </div>

        {/* Display Name Input */}
        <div className="mb-8">
          <label className="block text-xs text-gray-400 uppercase font-semibold mb-2 ml-1">Display Name</label>
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
          <label className="block text-xs text-gray-400 uppercase font-semibold mb-2 ml-1">About Me (Max 50 words)</label>
          <textarea
            value={tempData.about}
            onChange={(e) => setTempData({ ...tempData, about: e.target.value })}
            maxLength={300}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none text-sm"
            placeholder="Tell us a little about yourself..."
          />
          <div className="text-right text-[10px] text-gray-400 mt-1">
            {tempData.about?.length || 0}/300 chars
          </div>
        </div>

        {/* Banner Color Selection */}
        <div className="mb-8">
          <label className="block text-xs text-gray-400 uppercase font-semibold mb-3 ml-1">Card Banner Tint</label>
          <div className="flex flex-wrap gap-3">
            {Object.keys(COLORS).map((colorKey) => (
              <button
                key={colorKey}
                onClick={() => setTempData({ ...tempData, bannerColor: colorKey })}
                className={`w-8 h-8 rounded-full border-2 transition-all ${COLORS[colorKey]} 
                          ${tempData.bannerColor === colorKey ? 'border-gray-800 scale-110 shadow-md' : 'border-gray-200 hover:scale-105'}`}
                title={colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-200">Cancel</button>
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="flex-1 py-3 bg-primary text-white font-medium rounded-xl hover:bg-black transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </Modal>



      {/* ================= PREVIEW MODAL ================= */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        className="!bg-transparent !shadow-none overflow-visible flex items-center justify-center p-4"
        overlayClassName="!p-4 bg-black/50 backdrop-blur-sm flex items-center justify-center"
      >
        <div className="relative">
          <button
            onClick={() => setIsPreviewModalOpen(false)}
            className="absolute -top-10 right-0 text-white hover:text-gray-200 z-50 bg-black/20 rounded-full p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <ProfileCard user={user} profileData={profileData} />
        </div>
      </Modal>

      {/* ================= PASSWORD MODAL ================= */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        className="!bg-transparent !shadow-none !p-0 max-w-sm h-auto block overflow-visible"
        overlayClassName="!p-4"
      >
        <ChangePasswordModal
          onClose={() => setIsPasswordModalOpen(false)}
          isProfileView={true}
        />
      </Modal>

    </div >
  );
}

// --- Helper Component for Guidelines ---
function Section({ title, items }) {
  return (
    <div className="py-4 border-b border-black/5 last:border-b-0">
      <h2 className="font-bold text-gray-700 mb-4">{title}</h2>
      <ul className="list-disc pl-5 space-y-3 text-gray-600 text-[15px]">
        {items.map((item, i) => (
          <li key={i} className="pl-1 leading-relaxed">{item}</li>
        ))}
      </ul>
    </div>
  );
}
