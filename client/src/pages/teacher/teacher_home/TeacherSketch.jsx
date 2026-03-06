import React from "react";
import Whiteboard from "../../../components/Whiteboard";

export default function TeacherSketch() {
  return (
    <div className="space-y-6">
      <div className="w-full h-[80vh] bg-white p-4 rounded-lg shadow-sm overflow-hidden">
        <Whiteboard />
      </div>
    </div>
  );
}
