import React from "react";
import ClassRoom from "../../../components/community_comps/CommunityMain"; // Adjust path if needed

export default function TeacherClassRooms() {
  return (
    <div className="w-full h-full p-2">
      {/* Passing role="teacher" shows the Class Grid first, then Official Chat */}
      <ClassRoom role="teacher" />
    </div>
  );
}