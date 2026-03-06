import React, { useMemo } from "react";

// Helper to resolve profile images
const getAvatarUrl = (id) => {
  if (!id) return null;
  // Using explicit absolute paths or import.meta.url logic as used in Profile.jsx
  // Since we are in components/ui, we need to go up one more level than components/Profile.jsx
  return new URL(`../../assets/profile/${id}.png`, import.meta.url).href;
};

export default function Avatar({ user, profile, size = "md", className = "" }) {
  // Logic to determine avatar ID
  // 1. passed 'profile' object directly
  // 2. passed 'user' object which might have 'profile' property
  // 3. Fallback based on role if available
  
  const avatarId = useMemo(() => {
    // Priority:
    // 1. Direct 'avatar' property on profile (most common)
    // 2. 'profileImageId' on profile
    // 3. User object's profile.avatar
    // 4. Fallback based on Role

    if (profile?.avatar) return profile.avatar;
    if (profile?.profileImageId) return profile.profileImageId;
    if (user?.profile?.avatar) return user.profile.avatar;
    
    // Fallbacks
    // If we have a user role, use that.
    if (user?.role === "teacher" || profile?.role === "teacher") return 1;
    
    // Default Student (11 is female, 12 is male? Let's assume 11 for now)
    return 11;
  }, [user, profile]);

  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
    custom: "" 
  };

  const finalSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`${finalSizeClass} rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 relative ${className}`}>
      <img
        src={getAvatarUrl(avatarId)}
        alt="Avatar"
        className="w-full h-full object-cover block"
        onError={(e) => {
          e.target.style.display = 'none'; 
          // Could show a fallback initial div here if image fails, 
          // but relying on CSS bg-gray-100 for now.
        }}
      />
    </div>
  );
}
