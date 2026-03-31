import { useState, useMemo, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import apiClient from "../services/apiClient";
import ChangePasswordModal from "./ChangePasswordModal";
import Modal from "./ui/Modal";
import ProfileCard from "./ProfileCard"; // Import ProfileCard
import FeatureList from "./FeatureList";
import FeatureEventOverlay from "./FeatureEventOverlay";
import {
  getFeatureState,
  registerFeatureTap,
} from "../services/feature.service";
import { FEATURE_EVENT_BY_NAME } from "../utils/feature.constants";
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
  const [isFeatureEventOpen, setIsFeatureEventOpen] = useState(false);
  const [activeFeatureEvent, setActiveFeatureEvent] = useState(null);
  const [featureUnlocked, setFeatureUnlocked] = useState(
    () => getFeatureState().unlocked
  );

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

  const handleSectionNavigation = (sectionKey) => {
    if (sectionKey === "credits") {
      const result = registerFeatureTap();
      setFeatureUnlocked(result.unlocked);
      if (result.newlyUnlocked) {
        toast.success("Easter Egg Unlocked");
      }
    }

    setActiveSection(sectionKey);
  };

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

  const openSourceAttributions = [
    {
      name: "LottieFiles (Hourglass animation)",
      usage: "Server wake-up loading animation",
      link: "https://lottiefiles.com",
    },
    {
      name: "LottieFiles (Student login animation)",
      usage: "Login screen animation",
      link: "https://lottiefiles.com",
    },
    {
      name: "@dotlottie/react-player",
      usage: "DotLottie playback on Login",
      link: "https://github.com/dotlottie/react-player",
    },
    {
      name: "lottie-react",
      usage: "Lottie JSON playback",
      link: "https://github.com/LottieFiles/lottie-react",
    },
    {
      name: "Excalidraw",
      usage: "Whiteboard component",
      link: "https://github.com/excalidraw/excalidraw",
    },
    {
      name: "GIPHY API + React Components",
      usage: "GIF search and embedding",
      link: "https://developers.giphy.com",
    },
    {
      name: "React Datepicker",
      usage: "Date picker UI",
      link: "https://github.com/Hacker0x01/react-datepicker",
    },
    {
      name: "React Hot Toast",
      usage: "Toast notifications",
      link: "https://github.com/timolins/react-hot-toast",
    },
    {
      name: "Recharts",
      usage: "Charts in dashboards",
      link: "https://recharts.org",
    },
    {
      name: "Flaticon (icons)",
      usage: "Some UI icons/illustrations",
      link: "https://www.flaticon.com",
    },
  ];

  return (
    <div className="h-full w-full">
      <ProfileResponsiveView
        activeSection={activeSection}
        bannerGradient={bannerGradient}
        featureUnlocked={featureUnlocked}
        handleSectionNavigation={handleSectionNavigation}
        onBackToProfile={() => setActiveSection("profile")}
        onEditProfile={() => setIsEditModalOpen(true)}
        onOpenFeatureEvent={(name) => {
          const eventKey = FEATURE_EVENT_BY_NAME[name];
          if (!eventKey) return;
          setActiveFeatureEvent(eventKey);
          setIsFeatureEventOpen(true);
        }}
        onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
        onPreviewProfile={() => setIsPreviewModalOpen(true)}
        openSourceAttributions={openSourceAttributions}
        profileData={profileData}
        renderIcon={renderIcon}
        sections={sections}
        user={user}
      />

      <FeatureEventOverlay
        open={isFeatureEventOpen}
        eventKey={activeFeatureEvent}
        onClose={() => {
          setIsFeatureEventOpen(false);
          setActiveFeatureEvent(null);
        }}
      />

      {/* ================= EDIT MODAL ================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        className="max-w-md h-auto px-8 py-5 block"
      >
        <button
          onClick={() => setIsEditModalOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-lg font-bold text-primary text-center mb-4">Customize Profile</h2>

        {/* Avatar Selection */}
        <div className="flex flex-col items-center mb-4">
          <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-3">Choose Avatar</label>
          <div className="flex items-center gap-5">
            <button onClick={handlePrevAvatar} className="p-2 rounded-full hover:bg-gray-100 border border-gray-200 text-gray-800 transition-all shadow-sm active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="w-20 h-20 rounded-full border-4 border-green-500 overflow-hidden shadow-md relative ring-4 ring-green-50/50">
              <img src={getAvatarUrl(tempData.profileImageId)} alt="Selected" className="w-full h-full object-cover block" />
            </div>
            <button onClick={handleNextAvatar} className="p-2 rounded-full hover:bg-gray-100 border border-gray-200 text-gray-800 transition-all shadow-sm active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase tracking-wider">Avatar {availableAvatars.indexOf(tempData.profileImageId) + 1} of {availableAvatars.length}</p>
        </div>

        {/* Display Name Input */}
        <div className="mb-4">
          <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2 ml-1">Display Name</label>
          <input
            type="text"
            value={tempData.displayName}
            onChange={(e) => setTempData({ ...tempData, displayName: e.target.value })}
            className="w-full bg-[#F9FAFB] border border-gray-200 rounded-xl px-4 py-2.5 text-primary font-semibold focus:ring-2 focus:ring-green-500 focus:bg-white focus:border-transparent outline-none transition-all shadow-sm"
            placeholder="Enter public display name"
          />
        </div>

        {/* About Me Input */}
        <div className="mb-4">
          <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2 ml-1">About Me (Max 50 words)</label>
          <textarea
            value={tempData.about}
            onChange={(e) => setTempData({ ...tempData, about: e.target.value })}
            maxLength={300}
            rows={3}
            className="w-full bg-[#F9FAFB] border border-gray-200 rounded-xl px-4 py-2.5 text-gray-700 font-medium focus:ring-2 focus:ring-green-500 focus:bg-white focus:border-transparent outline-none transition-all resize-none text-sm shadow-sm"
            placeholder="Tell us a little about yourself..."
          />
          <div className="text-right text-[10px] text-gray-500 font-bold tracking-wider mt-1">
            {tempData.about?.length || 0}/300 chars
          </div>
        </div>

        {/* Banner Color Selection */}
        <div className="mb-6">
          <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-3 ml-1">Card Banner Tint</label>
          <div className="flex flex-wrap gap-3 px-1">
            {Object.keys(COLORS).map((colorKey) => (
              <button
                key={colorKey}
                onClick={() => setTempData({ ...tempData, bannerColor: colorKey })}
                className={`w-7 h-7 rounded-full border-2 transition-all ${COLORS[colorKey]} 
                           ${tempData.bannerColor === colorKey 
                             ? 'ring-2 ring-offset-2 ring-[#0F172A] scale-110 border-transparent shadow-md' 
                             : 'border-transparent hover:scale-110 shadow-sm'}`}
                title={colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button 
            onClick={() => setIsEditModalOpen(false)} 
            className="flex-1 py-3 text-gray-600 font-bold text-sm bg-gray-100/80 hover:bg-gray-100 rounded-xl transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="flex-1 py-3 bg-[#0F172A] text-white font-bold text-sm rounded-xl hover:bg-[#1e293b] transition-all shadow-md active:scale-95 disabled:opacity-50"
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
        overlayClassName="flex items-center justify-center !p-4"
        backdropClassName="bg-black/60 backdrop-blur-md"
      >
        <div className="relative">
          <ProfileCard 
            user={user} 
            profileData={profileData} 
            onClose={() => setIsPreviewModalOpen(false)} 
          />
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

    </div>
  );
}

function ProfileResponsiveView({
  activeSection,
  bannerGradient,
  featureUnlocked,
  handleSectionNavigation,
  onBackToProfile,
  onEditProfile,
  onOpenFeatureEvent,
  onOpenPasswordModal,
  onPreviewProfile,
  openSourceAttributions,
  profileData,
  renderIcon,
  sections,
  user,
}) {
  const activeLabel = sections.find((section) => section.key === activeSection)?.label;
  const statGridClass = user.role === "student" ? "grid-cols-3" : "grid-cols-2";
  const primaryStatLabel = user.role === "teacher" ? "Dept" : "Course";
  const primaryStatValue = user.role === "teacher"
    ? (user.profile?.department || "N/A")
    : (user.profile?.course || "N/A");
  const mobileSectionRef = useRef(null);
  const desktopSectionRef = useRef(null);
  const desktopProfileRef = useRef(null);

  useEffect(() => {
    const scrollableNodes = [];
    const collectScrollableAncestors = (node) => {
      let current = node;
      while (current) {
        if (current instanceof HTMLElement) {
          const styles = window.getComputedStyle(current);
          const canScrollY = /(auto|scroll)/.test(styles.overflowY) && current.scrollHeight > current.clientHeight;
          if (canScrollY) {
            scrollableNodes.push(current);
          }
        }
        current = current?.parentElement || null;
      }
    };

    collectScrollableAncestors(mobileSectionRef.current);
    collectScrollableAncestors(desktopSectionRef.current);
    collectScrollableAncestors(desktopProfileRef.current);

    const scrollAllToTop = () => {
      window.scrollTo({ top: 0, behavior: "auto" });
      document.scrollingElement?.scrollTo({ top: 0, behavior: "auto" });
      mobileSectionRef.current?.scrollTo({ top: 0, behavior: "auto" });
      desktopSectionRef.current?.scrollTo({ top: 0, behavior: "auto" });
      desktopProfileRef.current?.scrollTo({ top: 0, behavior: "auto" });
      scrollableNodes.forEach((node) => node.scrollTo({ top: 0, behavior: "auto" }));
    };

    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      scrollAllToTop();
      secondFrame = requestAnimationFrame(scrollAllToTop);
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) {
        cancelAnimationFrame(secondFrame);
      }
    };
  }, [activeSection]);

  return (
    <div className="h-full w-full px-4 py-4 lg:p-6">
      <div className="mx-auto flex h-full w-full max-w-md flex-col lg:max-w-none lg:flex-row lg:items-stretch lg:gap-6">
        <div className="lg:hidden">
          {activeSection === "profile" ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-none">
                <div className={`relative h-28 bg-gradient-to-b ${bannerGradient} transition-colors duration-500`}>
                  <div className="absolute inset-0 bg-white/10" />
                  <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
                      {user.role}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onPreviewProfile}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-white/75 text-gray-700 shadow-sm backdrop-blur-md transition hover:bg-white"
                        aria-label="Preview profile"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={onEditProfile}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-white/85 text-gray-800 shadow-sm backdrop-blur-md transition hover:bg-white"
                        aria-label="Edit profile"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="relative px-4 pb-4">
                  <div className="-mt-10 flex flex-col items-center text-center">
                    <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-lg ring-1 ring-black/5">
                      <img src={getAvatarUrl(profileData.profileImageId)} alt="Avatar" className="h-full w-full object-cover" />
                    </div>
                    <h1 className="mt-3 text-[32px] font-black leading-none tracking-tight text-gray-900">
                      {profileData.displayName || "Student"}
                    </h1>

                    <div className="mt-4 w-full max-w-[280px] space-y-2 text-left">
                      <div className="flex items-baseline gap-2">
                        <p className="min-w-[94px] text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Reg:</p>
                        <p className="break-words text-[14px] font-semibold leading-5 text-gray-800">
                          {user.regno || user.profile?.regno || "N/A"}
                        </p>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="min-w-[94px] text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Contact:</p>
                        <p className="break-all text-[13px] font-medium leading-5 text-gray-600" title={user.email}>
                          {user.email}
                        </p>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="min-w-[94px] text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Original Name:</p>
                        <p className="text-[14px] font-semibold leading-5 text-gray-600">
                          {user.name || user.officialName || profileData.displayName || "Student"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex w-full items-center justify-center rounded-[22px] border border-black/5 bg-[#f8f8f8] px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                      <div className={`grid w-full ${statGridClass} items-start gap-2`}>
                        <div className="min-w-0 px-1">
                          <p className="break-words text-[15px] font-black leading-5 text-gray-900">{primaryStatValue}</p>
                          <p className="mt-1 text-[10px] font-medium text-gray-500">{primaryStatLabel}</p>
                        </div>
                        {user.role === "student" && (
                          <div className="min-w-0 border-l border-r border-black/5 px-1">
                            <p className="text-[15px] font-black leading-5 text-gray-900">{user.profile?.semester || "-"}</p>
                            <p className="mt-1 text-[10px] font-medium text-gray-500">Semester</p>
                          </div>
                        )}
                        <div className={`min-w-0 px-1 ${user.role !== "student" ? "border-l border-black/5" : ""}`}>
                          <p className="break-words text-[15px] font-black leading-5 text-gray-900">{user.profile?.shift || "N/A"}</p>
                          <p className="mt-1 text-[10px] font-medium text-gray-500">Shift</p>
                        </div>
                      </div>
                    </div>

                    <MobileAboutSection about={profileData.about} />
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-none">
                <div className="border-b border-black/5 px-5 py-4">
                  <p className="text-sm font-semibold text-gray-500">Settings</p>
                </div>
                <div className="divide-y divide-black/5">
                  {sections.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => handleSectionNavigation(item.key)}
                      className="group flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-gray-50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-600">
                        {renderIcon(item.key, false)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-800">{item.label}</p>
                      </div>
                      <svg className="h-4 w-4 text-gray-400 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div key={activeSection} className="flex h-full flex-col overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-none">
              <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-black/5 px-4 py-4">
                <button
                  onClick={onBackToProfile}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                  aria-label="Go back"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M10,22.03c-.77,0-1.51-.3-2.09-.88L1.18,14.82c-1.57-1.57-1.57-4.09-.02-5.64,0,0,.01-.01,.02-.02L7.93,2.81c.84-.85,2.09-1.1,3.22-.63s1.84,1.52,1.85,2.74v2.06h7.03c2.19,0,3.97,1.8,3.97,4.01v1.98c0,2.21-1.78,4.01-3.97,4.01h-7.03v2.06c0,1.23-.71,2.28-1.85,2.75-.38,.16-.77,.23-1.15,.23Z" />
                  </svg>
                </button>
                <h1 className="text-center text-xl font-black tracking-tight text-gray-900">{activeLabel}</h1>
                <span className="invisible flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M10,22.03c-.77,0-1.51-.3-2.09-.88L1.18,14.82c-1.57-1.57-1.57-4.09-.02-5.64,0,0,.01-.01,.02-.02L7.93,2.81c.84-.85,2.09-1.1,3.22-.63s1.84,1.52,1.85,2.74v2.06h7.03c2.19,0,3.97,1.8,3.97,4.01v1.98c0,2.21-1.78,4.01-3.97,4.01h-7.03v2.06c0,1.23-.71,2.28-1.85,2.75-.38,.16-.77,.23-1.15,.23Z" />
                  </svg>
                </span>
              </div>

              <div ref={mobileSectionRef} className="flex-1 overflow-y-auto no-scrollbar px-4 py-5">
                <ProfileSectionContent
                  activeSection={activeSection}
                  compact={true}
                  featureUnlocked={featureUnlocked}
                  onOpenFeatureEvent={onOpenFeatureEvent}
                  onOpenPasswordModal={onOpenPasswordModal}
                  openSourceAttributions={openSourceAttributions}
                />
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:flex lg:h-full lg:flex-1 lg:flex-col">
          {activeSection === "profile" ? (
            <div className="flex h-full flex-col overflow-hidden rounded-[34px] border border-black/5 bg-white shadow-none">
              <div ref={desktopProfileRef} className="relative h-full overflow-y-auto no-scrollbar bg-gray-50/30">
                <div className={`relative h-40 shrink-0 bg-gradient-to-r ${bannerGradient} transition-colors duration-500`}>
                  <div className="absolute inset-0 bg-white/10" />
                  <div className="absolute right-6 top-6 flex items-center gap-3">
                    <button
                      onClick={onPreviewProfile}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/75 text-gray-700 shadow-sm backdrop-blur-md transition hover:bg-white"
                      aria-label="Preview profile"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={onEditProfile}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/85 text-gray-800 shadow-sm backdrop-blur-md transition hover:bg-white"
                      aria-label="Edit profile"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="relative z-10 -mt-16 px-8 pb-8">
                  <div className="mb-8 flex items-end gap-6">
                    <div className="h-36 w-36 shrink-0 overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-lg">
                      <img
                        src={getAvatarUrl(profileData.profileImageId)}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 pb-2">
                      <h1 className="truncate text-3xl font-black leading-tight tracking-tight text-gray-800">
                        {profileData.displayName || "Student"}
                      </h1>
                      <div className="mt-3 flex items-center gap-2 text-sm font-medium text-gray-500">
                        <span className="truncate">{user.profile?.name || "Official Name"}</span>
                        <span className="h-1 w-1 rounded-full bg-gray-300" />
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-500">
                          {user.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="group md:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.05)] transition-all hover:border-gray-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="rounded-lg bg-orange-50 p-1.5 text-orange-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">About Me</h3>
                      </div>
                      <p className="pl-1 text-sm font-medium leading-relaxed text-gray-600">
                        {profileData.about || <span className="italic text-gray-400">No description provided.</span>}
                      </p>
                    </div>

                    <div className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-500">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0h4" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Registration ID</p>
                        <p className="truncate font-mono text-sm font-bold text-gray-800">{user.regno || user.profile?.regno || "N/A"}</p>
                      </div>
                    </div>

                    <div className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-colors group-hover:bg-purple-50 group-hover:text-purple-500">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Contact</p>
                        <p className="truncate text-sm font-semibold text-gray-700" title={user.email}>{user.email}</p>
                      </div>
                    </div>

                    <div className={`grid grid-cols-2 gap-4 md:col-span-2 ${user.role === "student" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                      <div className="group relative block overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-blue-100 hover:shadow-md">
                        <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-blue-50 opacity-50 transition-transform group-hover:scale-110" />
                        <div className="relative z-10 mb-2 flex items-center gap-2">
                          <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                            <path d="M6 12v5c3 3 9 3 12 0v-5" />
                          </svg>
                          <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">{primaryStatLabel}</span>
                        </div>
                        <span className="relative z-10 block truncate pr-2 text-lg font-black text-gray-800">{primaryStatValue}</span>
                      </div>

                      {user.role === "student" && (
                        <div className="group relative block overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-pink-100 hover:shadow-md">
                          <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-pink-50 opacity-50 transition-transform group-hover:scale-110" />
                          <div className="relative z-10 mb-2 flex items-center gap-2">
                            <svg className="h-4 w-4 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                              <line x1="16" x2="16" y1="2" y2="6" />
                              <line x1="8" x2="8" y1="2" y2="6" />
                              <line x1="3" x2="21" y1="10" y2="10" />
                            </svg>
                            <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Semester</span>
                          </div>
                          <span className="relative z-10 block pl-1 text-lg font-black text-gray-800">{user.profile?.semester || "-"}</span>
                        </div>
                      )}

                      <div className="group relative block overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-amber-100 hover:shadow-md">
                        <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-amber-50 opacity-50 transition-transform group-hover:scale-110" />
                        <div className="relative z-10 mb-2 flex items-center gap-2">
                          <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Shift</span>
                        </div>
                        <span className="relative z-10 block truncate pl-1 text-lg font-black text-gray-800">{user.profile?.shift || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col overflow-hidden rounded-[34px] border border-black/5 bg-white shadow-none">
              <div className="border-b border-black/5 px-8 py-6">
                <button
                  onClick={onBackToProfile}
                  className="mb-4 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M10,22.03c-.77,0-1.51-.3-2.09-.88L1.18,14.82c-1.57-1.57-1.57-4.09-.02-5.64,0,0,.01-.01,.02-.02L7.93,2.81c.84-.85,2.09-1.1,3.22-.63s1.84,1.52,1.85,2.74v2.06h7.03c2.19,0,3.97,1.8,3.97,4.01v1.98c0,2.21-1.78,4.01-3.97,4.01h-7.03v2.06c0,1.23-.71,2.28-1.85,2.75-.38,.16-.77,.23-1.15,.23Z" />
                  </svg>
                  <span>Go back</span>
                </button>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Settings</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">{activeLabel}</h1>
              </div>
              <div ref={desktopSectionRef} className="flex-1 overflow-y-auto no-scrollbar px-8 py-8">
                <ProfileSectionContent
                  activeSection={activeSection}
                  compact={false}
                  featureUnlocked={featureUnlocked}
                  onOpenFeatureEvent={onOpenFeatureEvent}
                  onOpenPasswordModal={onOpenPasswordModal}
                  openSourceAttributions={openSourceAttributions}
                />
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block lg:h-full lg:w-1/3 lg:max-w-xs">
          <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-none">
            <div className="border-b border-black/5 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Settings</p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-gray-900">Profile Menu</h2>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-4">
              <div className="space-y-1">
                {sections.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleSectionNavigation(item.key)}
                    className={`group flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                      activeSection === item.key
                        ? "border-l-green-500 bg-green-50 text-green-700"
                        : "border-l-transparent bg-white text-gray-500 hover:bg-gray-50/60 hover:text-gray-800"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                      activeSection === item.key ? "bg-green-100/80 text-green-700" : "bg-gray-50 text-gray-500"
                    }`}>
                      {renderIcon(item.key, activeSection === item.key)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{item.label}</p>
                    </div>
                    <svg
                      className={`h-4 w-4 transition-transform ${
                        activeSection === item.key ? "text-green-600" : "text-gray-400 group-hover:translate-x-0.5"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileAboutSection({ about }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const aboutText = typeof about === "string" ? about.trim() : "";
  const shouldShowToggle = aboutText.length > 110;
  const collapsedPreview = shouldShowToggle
    ? `${aboutText.slice(0, 88).trimEnd()}...`
    : aboutText;

  return (
    <div className="mt-4 w-full border-t border-black/5 px-1 pt-4 text-left">
      <h3 className="text-lg font-bold text-gray-900">About Me</h3>
      {aboutText ? (
        <>
          <p className="mt-3 text-[14px] leading-7 text-gray-500">
            {isExpanded ? aboutText : collapsedPreview}{" "}
            {shouldShowToggle && (
              <button
                type="button"
                onClick={() => setIsExpanded((expanded) => !expanded)}
                className="inline font-semibold text-[#f59e0b] transition hover:text-[#d97706]"
              >
                {isExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </p>
        </>
      ) : (
        <p className="mt-3 text-[14px] italic leading-7 text-gray-400">
          No description provided.
        </p>
      )}
    </div>
  );
}

function ProfileSectionContent({
  activeSection,
  compact,
  featureUnlocked,
  onOpenFeatureEvent,
  onOpenPasswordModal,
  openSourceAttributions,
}) {
  const wrapperClass = compact
    ? "rounded-[28px] border border-black/5 bg-[#fcfcfc] p-5 shadow-sm"
    : "max-w-3xl rounded-[30px] border border-black/5 bg-[#fcfcfc] p-7 shadow-sm";

  if (activeSection === "guidelines") {
    return (
      <div className={`${wrapperClass} text-gray-700`}>
        <p className={`${compact ? "text-base leading-9" : "text-lg leading-9"} font-medium`}>
          These guidelines define acceptable usage, responsibilities,
          and limitations of the platform.
        </p>
        <div className={`${compact ? "mt-6 space-y-2 text-sm leading-8" : "mt-8 space-y-3 text-sm leading-8"}`}>
          <Section title="General Rules" items={["Accounts are personal.", "Access is role-based.", "Activity is logged."]} />
          <Section title="Home Rules" items={["Dashboard is auto-generated.", "To-do lists are private."]} />
          <Section title="AI Rules" items={["AI is for assistance only.", "Check generated content."]} />
          <Section title="Privacy" items={["Data is secured.", "Do not share passwords."]} />
        </div>
      </div>
    );
  }

  if (activeSection === "credits") {
    return (
      <div className={`${wrapperClass} text-gray-700`}>
        <p className="mb-4 text-sm font-medium text-gray-600">Developed by:</p>
        <FeatureList
          unlocked={featureUnlocked}
          onNameClick={onOpenFeatureEvent}
        />
      </div>
    );
  }

  if (activeSection === "security") {
    return (
      <div className={wrapperClass}>
        <div className={`${compact ? "rounded-[24px] p-5" : "rounded-[26px] p-6"} border border-black/5 bg-white shadow-sm`}>
          <h3 className={`${compact ? "text-lg" : "text-xl"} font-bold text-primary`}>Password & Authentication</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Update your password to keep your account secure.
          </p>
          {compact ? (
            <button
              onClick={onOpenPasswordModal}
              className="mt-5 w-full rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
            >
              Change Password
            </button>
          ) : (
            <div className="mt-5 flex items-center justify-between gap-6">
              <div>
                <p className="font-medium text-gray-700">Change Password</p>
                <p className="mt-1 text-sm text-gray-500">Update your password to keep your account secure.</p>
              </div>
              <button
                onClick={onOpenPasswordModal}
                className="rounded-2xl bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
              >
                Change Password
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeSection === "open") {
    return (
      <div className={`${wrapperClass} text-sm leading-7 text-gray-700`}>
        <p className="font-medium">
          This project uses open-source libraries and third-party assets. Thanks to the
          creators and communities behind these tools.
        </p>

        <div className={`${compact ? "mt-5 rounded-[24px] p-4" : "mt-6 rounded-[26px] p-5"} border border-black/5 bg-white shadow-sm`}>
          <h3 className="text-sm font-bold text-gray-800">Libraries & Assets</h3>
          <ul className="mt-4 space-y-3">
            {openSourceAttributions.map((item) => (
              <li key={item.name} className={`${compact ? "p-3" : "p-4"} rounded-2xl border border-black/5 bg-[#fafafa]`}>
                <div className={`flex ${compact ? "items-center justify-between" : "items-center gap-3"}`}>
                  <span className="font-semibold text-gray-800">{item.name}</span>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-blue-600 underline"
                  >
                    Source
                  </a>
                </div>
                <div className="mt-1 text-xs text-gray-500">{item.usage}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 text-xs italic text-gray-500">
          If any attribution is missing or incorrect, let us know and we will update it
          promptly.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center rounded-[30px] border border-dashed border-black/10 bg-[#fcfcfc] px-6 py-16 text-center text-sm italic text-gray-400">
      Content for {activeSection} coming soon.
    </div>
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
