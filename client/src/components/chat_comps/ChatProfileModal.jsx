import React, { useState, useEffect } from "react";
import axios from "axios";
import { server } from "../../main";
import { auth } from "../../firebase/firebase";
import Modal from "../ui/Modal";
import ProfileCard from "../ProfileCard";
import LoadingState from "../ui/LoadingState";

export default function ChatProfileModal({ user, onClose, onUnfriend, role }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch full profile data when modal opens
  useEffect(() => {
    const fetchProfile = async () => {
      // Check for firebaseUid (preferred) or _id (fallback)
      const userId = user?.firebaseUid || user?._id || user?.id; 
      
      console.log("🔍 ProfileModal: Attempting to fetch profile for:", {
          name: user?.name,
          firebaseUid: user?.firebaseUid,
          _id: user?._id,
          id: user?.id,
          derivedUserId: userId
      });

      if (!userId) {
          console.warn("⚠️ ProfileModal: No valid User ID found to fetch.");
          // If no ID, we can't fetch, so just use what we have
          setProfileData(user);
          return;
      }
      
      try {
        setLoading(true);
        // GET TOKEN FOR AUTHENTICATION
        const token = await auth.currentUser.getIdToken();
        const { data } = await axios.get(`${server}/friends/profile/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("✅ ProfileModal: Fetched data:", data);
        setProfileData(data); 
      } catch (error) {
        console.error("❌ ProfileModal: Failed to fetch profile:", error);
        setProfileData(user); 
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchProfile();
  }, [user]);

  if (!user) return null;

  const displayUser = profileData || user;
  // If we have profileData key in displayUser, use it, otherwise use displayUser.profile or displayUser itself
  // ProfileCard expects separate profileData prop for overrides, but we can just pass the profile object
  // FIX: ProfileCard expects 'regno' to be INSIDE the profile object, but our API returns it at root.
  const profileOverride = {
      ...(displayUser.profile || {}),
      regno: displayUser.regno || displayUser.profile?.regno // Ensure regno is passed
  };

  return (
      <Modal
        isOpen={!!user}
        onClose={onClose}
        // Container: Transparent because we just want the ProfileCard + Text
        className="!bg-transparent !shadow-none overflow-visible flex flex-col items-center justify-center p-0 !max-w-none !w-auto gap-6 pointer-events-none" 
        // pointer-events-none on container so clicks pass through gaps to backdrop? 
        // Actually ProfileCard needs pointer-events-auto.
        
        // Overlay: Just positioning
        overlayClassName="!p-4 flex items-center justify-center"
        // Backdrop: Darker (80%) for better text visibility
        backdropClassName="bg-black/80 backdrop-blur-sm"
      >
           <div className="relative pointer-events-auto">
             {/* LOADING STATE */}
             {loading ? (
                <div className="w-[340px] h-[400px] bg-white rounded-[30px] flex items-center justify-center shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)]">
                    <LoadingState size="sm" />
                </div>
             ) : (
                <ProfileCard user={displayUser} profileData={profileOverride} />
             )}
           </div>
           
           {/* Close Instruction */}
           <div className="text-white/80 text-sm font-medium animate-pulse pointer-events-auto cursor-pointer" onClick={onClose}>
              Click anywhere to close
           </div>
      </Modal>
  );
}
