import React from "react";
// Adjust the path below to point to where you saved the main Groups.jsx
import Groups from "../../../components/group_comps/GroupsMain";

export default function TeacherGroups() {
  return (
    <div className="w-full h-full px-0 pt-0 pb-0">
      <Groups role="teacher" />
    </div>
  );
}
