import React from "react";
import Whiteboard from "../../../components/Whiteboard";

export default function TeacherSketch() {
  return (
    <div className="w-full h-[72vh] min-[426px]:h-[78vh] min-[769px]:h-[85vh] rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white">
      <Whiteboard />
    </div>
  );
}
