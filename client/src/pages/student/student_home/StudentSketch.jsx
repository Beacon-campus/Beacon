import Whiteboard from "../../../components/Whiteboard";

export default function StudentSketch() {
  return (
    <div className="w-full h-[72vh] min-[426px]:h-[78vh] min-[769px]:h-[85vh] rounded-2xl overflow-hidden premium-shadow border border-white/20 bg-white">
      <Whiteboard />
    </div>
  );
}
