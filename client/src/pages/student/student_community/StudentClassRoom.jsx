import React from "react";
import ClassRoom from "../../../components/community_comps/CommunityMain"; // Adjust path if needed

export default function StudentClassRoom() {
  return (
    <div className="w-full h-full px-0 pt-0 pb-0">
      {/* Passing role="student" enables the Official/Unofficial toggle */}
      <ClassRoom role="student" />
    </div>
  );
}
