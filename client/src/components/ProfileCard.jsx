import React from "react";

// Helper to resolve profile images
const getAvatarUrl = (id) => {
  if (!id) return null;
  return new URL(`../assets/profile/${id}.png`, import.meta.url).href;
};

// Colors from NoteCard (for palette matching)
const BANNER_COLORS = {
  default: "from-blue-300 to-white", // Default fallback
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

export default function ProfileCard({ user, profileData, onClose }) {
  // Merge prop data with user data for preview
  const displayUser = {
    ...user,
    profile: {
      ...user?.profile,
      ...profileData,
    }
  };

  const { profile } = displayUser;
  const isTeacher = displayUser.role === "teacher";
  
  const avatarUrl = getAvatarUrl(profile?.avatar || (isTeacher ? 1 : 11));
  
  // Resolve Banner Color
  const colorKey = profile?.bannerColor || "blue";
  const gradientClass = BANNER_COLORS[colorKey] || BANNER_COLORS.default;

  return (
    <div className="w-[340px] bg-white rounded-[30px] overflow-hidden font-sans text-gray-800 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)] border border-gray-100 relative group transition-all hover:shadow-[0_25px_50px_-10px_rgba(0,0,0,0.15)]">
      
      {/* --- BANNER (Custom Tint) --- */}
      <div 
        className={`h-[140px] w-full relative overflow-hidden bg-gradient-to-b ${gradientClass} transition-colors duration-500`}
      >
        {/* Decorative cloud-like blobs (White) */}
        <div className="absolute top-10 -left-10 w-40 h-40 bg-white opacity-40 rounded-full blur-2xl"></div>
        <div className="absolute top-5 right-0 w-32 h-32 bg-white opacity-50 rounded-full blur-2xl"></div>
        
        {/* Close Button (Top Right) */}
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-white transition-all hover:scale-110 z-20 group drop-shadow-md"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* --- AVATAR (Overlapping) --- */}
      <div className="flex justify-center -mt-[60px] relative z-10">
        <div className="p-0 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-[4px] border-white ring-1 ring-black/5">
             <div className="w-[110px] h-[110px] rounded-full overflow-hidden bg-gray-50 relative">
               <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
        </div>
      </div>

      {/* --- CONTENT --- */}
      <div className="px-5 pb-8 pt-4 text-center">
        
        {/* Name Block */}
        <div className="mb-4">
          <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight leading-none mb-0 font-sans">
             {profile?.displayName || "User"}
          </h2>
          <div className="flex flex-col items-center justify-center mt-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
               {profile?.name || "Official Name"}
            </p>
            {/* Dedicated Role Line */}
            <div className="mt-2 bg-emerald-50/80 px-3 py-1 rounded-full border border-emerald-100/50 flex items-center justify-center shadow-sm">
                <span className="text-[9px] font-black tracking-[0.12em] uppercase text-emerald-700 leading-none antialiased">
                    {isTeacher ? "FACULTY" : "STUDENT"}
                </span>
            </div>
          </div>
        </div>

        {/* About Block */}
        {/* About Block with Scrolling Animation */}
        <div className="mb-6 px-1 h-[4.5rem] flex items-center justify-center">
           {(() => {
             const text = profile?.about || "This user is too busy studying to write a bio.";
             const len = text.length;

             // Dynamic Font Sizing logic
             let fontSizeClass = "text-sm"; 
             if (len > 150) fontSizeClass = "text-[9px] leading-tight";
             else if (len > 100) fontSizeClass = "text-[10px] leading-snug";
             else if (len > 60) fontSizeClass = "text-xs leading-normal";

             return (
               <p className={`${fontSizeClass} text-gray-500 font-medium text-center line-clamp-4 leading-relaxed`}>
                 {text.replace(/\s+(!)/g, '$1')}
               </p>
             );
           })()}
        </div>

        {/* --- STATS / ROLES ROW --- */}
        <div className="flex justify-between items-stretch bg-slate-50/80 rounded-2xl px-2 py-4 border border-gray-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
            
            {/* 1. Course/Dept */}
            <div className="flex flex-col items-center justify-center flex-1 border-r border-gray-200/60 last:border-0 px-1">
                <span className="text-base font-black text-[#0F172A] leading-tight">
                    {isTeacher ? (profile?.department || "N/A") : (profile?.course || "N/A")}
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase mt-1">
                    {isTeacher ? "Dept" : "Course"}
                </span>
            </div>

            {/* 2. Semester */}
            {!isTeacher && (
                <div className="flex flex-col items-center justify-center flex-1 border-r border-gray-200/60 last:border-0 px-1">
                    <span className="text-base font-black text-[#0F172A] leading-tight">
                        {profile?.semester || "-"}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase mt-1">Sem</span>
                </div>
            )}

            {/* 3. Shift */}
            <div className="flex flex-col items-center justify-center flex-1 border-r border-gray-200/60 last:border-0 px-1">
                 <span className="text-base font-black text-[#0F172A] leading-tight text-center break-words w-full px-1">
                    {profile?.shift || "N/A"}
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase mt-1">Shift</span>
            </div>

        </div>

         {/* RegNo Footer */}
        <div className="mt-4 hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                ID: {profile?.regno || "UNKNOWN"}
            </span>
        </div>

      </div>
    </div>
  );
}
