import React from "react";
import ClassRoom from "../../../components/community_comps/CommunityMain"; // Adjust path if needed

export default function TeacherClassRooms() {
  return (
    <div className="w-full h-full px-0 pt-0 pb-0">
      {/* Passing role="teacher" shows the Class Grid first, then Official Chat */}
      <ClassRoom role="teacher" />
    </div>
  );
}
