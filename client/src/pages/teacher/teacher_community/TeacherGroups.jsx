import React from "react";
// Adjust the path below to point to where you saved the main Groups.jsx
import Groups from "../../../components/group_comps/GroupsMain";

export default function TeacherGroups() {
  return (
    <div className="w-full h-full p-2">
      <Groups role="teacher" />
    </div>
  );
}