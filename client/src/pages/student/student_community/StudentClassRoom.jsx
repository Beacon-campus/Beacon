import React from "react";
import ClassRoom from "../../../components/community_comps/CommunityMain"; // Adjust path if needed

export default function StudentClassRoom() {
  return (
    <div className="w-full h-full p-2">
      {/* Passing role="student" enables the Official/Unofficial toggle */}
      <ClassRoom role="student" />
    </div>
  );
}