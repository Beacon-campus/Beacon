import React from "react";
import Avatar from "./Avatar";

export default function GroupAvatarStack({ participants = [], size = "md", limit = 2 }) {
  // If no participants, show a default icon placeholder or return null
  if (!participants || participants.length === 0) {
    return (
       <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
         GP
       </div>
    );
  }

  const showParticipants = participants.slice(0, limit);
  const remainingCount = Math.max(0, participants.length - limit);

  // Adjust overlapping based on size
  const overlapClass = size === "sm" ? "-ml-3" : size === "lg" ? "-ml-5" : "-ml-4";
  
  // Size for the generic "More" circle
  const sizeClasses = {
    sm: "w-8 h-8 text-[10px]",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm",
  };
  const boxSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className="flex items-center">
      {showParticipants.map((p, idx) => (
        <Avatar
          key={p._id || idx}
          user={p} // or profile={p.profile} depending on data structure
          profile={p.profile} // Pass both just in case
          size={size}
          className={`border-2 border-white ${idx > 0 ? overlapClass : ""} relative`}
          style={{ zIndex: showParticipants.length - idx + 2 }}
        />
      ))}
      
      {remainingCount > 0 && (
        <div className={`${boxSize} rounded-full bg-gray-100 border-2 border-white flex items-center justify-center font-bold text-gray-500 shrink-0 ${overlapClass} relative z-0`}>
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
