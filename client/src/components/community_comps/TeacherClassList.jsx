import React from "react";
import BookIcon from "../../assets/classroom/book.svg";
import SendIcon from "../../assets/send.svg";

const AESTHETIC_COLORS = ["#FFD1DC", "#FFABAB", "#FFC3A0", "#FF677D", "#D4A5A5", "#B5EAD7", "#C7CEEA", "#E2F0CB", "#FF9AA2", "#FFDAC1"];
const getClassroomColor = (id) => {
  try {
    const stored = JSON.parse(localStorage.getItem("classroomColors") || "{}");
    if (stored[id]) return stored[id];
    const color = AESTHETIC_COLORS[Math.floor(Math.random() * AESTHETIC_COLORS.length)];
    stored[id] = color;
    localStorage.setItem("classroomColors", JSON.stringify(stored));
    return color;
  } catch { return "#E2F0CB"; }
};

export default function TeacherClassList({ classes, onSelect }) {
  return (
    <div className="px-4 py-4 min-[426px]:px-5 min-[426px]:py-5 min-[769px]:p-6 h-full overflow-y-auto no-scrollbar">
        <h2 className="text-xl min-[426px]:text-2xl font-bold text-gray-800 mb-4 min-[769px]:mb-6">Classrooms</h2>
        {classes.length === 0 ? (
            <p className="text-gray-400">No official classrooms found.</p>
        ) : (
            <div className="grid grid-cols-1 min-[426px]:grid-cols-2 lg:grid-cols-3 gap-3 min-[426px]:gap-4 min-[769px]:gap-6 mt-4 min-[769px]:mt-6">
                {classes.map((cls) => (
                    <div key={cls._id} onClick={() => onSelect(cls)} className="bg-white rounded-2xl p-4 min-[426px]:p-5 min-[769px]:p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 premium-transition cursor-pointer flex flex-col gap-3 min-[769px]:gap-4 group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 min-[426px]:w-12 min-[426px]:h-12 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden border border-black/10 shrink-0" style={{ backgroundColor: getClassroomColor(cls._id) }}>
                                <img src={BookIcon} className="w-6 h-6 min-[426px]:w-7 min-[426px]:h-7 object-contain opacity-90" alt="" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-base min-[426px]:text-lg">{cls.name}</h3>
                                <p className="text-[10px] min-[426px]:text-xs text-gray-500 uppercase tracking-wide">Official Channel</p>
                            </div>
                        </div>
                        <div className="mt-auto pt-3 min-[769px]:pt-4 border-t border-gray-50 flex justify-between items-center text-[13px] min-[426px]:text-sm font-medium text-gray-600">
                            <span>View Chat</span>
                            <img src={SendIcon} className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" alt="" />
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
}
