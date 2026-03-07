import Whiteboard from "../../../components/Whiteboard";

export default function StudentSketch() {
  return (
    <div className="space-y-6">
      <div className="w-full h-[80vh] premium-card p-4 overflow-hidden">
        <Whiteboard />
      </div>
    </div>
  );
}
