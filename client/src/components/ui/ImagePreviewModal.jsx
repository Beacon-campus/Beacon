import { useEffect, useState } from "react";
import Modal from "./Modal";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  imageName = "Image preview",
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen]);

  const handleWheelZoom = (event) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.15 : -0.15;
    setZoom((prev) => clamp(prev + delta, 1, 4));
  };

  const handleMouseDown = (event) => {
    event.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: event.clientX - offset.x,
      y: event.clientY - offset.y,
    });
  };

  const handleMouseMove = (event) => {
    if (!isDragging) return;
    setOffset({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen || !imageUrl) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!bg-transparent !shadow-none !max-w-none !w-auto !overflow-visible p-0"
      overlayClassName="!p-4 flex items-center justify-center"
      backdropClassName="bg-black/80 backdrop-blur-sm"
    >
      <div className="pointer-events-auto w-[90vw] h-[85vh] rounded-xl overflow-hidden bg-black border border-white/20 relative">
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 rounded bg-white/20 text-white text-xs font-bold hover:bg-white/30"
            onClick={() => setZoom((z) => clamp(z - 0.2, 1, 4))}
          >
            -
          </button>
          <span className="px-2 py-1 rounded bg-white/20 text-white text-xs font-semibold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="px-2 py-1 rounded bg-white/20 text-white text-xs font-bold hover:bg-white/30"
            onClick={() => setZoom((z) => clamp(z + 0.2, 1, 4))}
          >
            +
          </button>
        </div>
        <div
          className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          onWheel={handleWheelZoom}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
        >
          <img
            src={imageUrl}
            alt={imageName}
            draggable={false}
            className="max-w-[90%] max-h-[90%] object-contain select-none"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
          />
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/85 bg-black/50 rounded px-2 py-1">
          Scroll to zoom - Drag to move - Tap outside to close
        </div>
      </div>
    </Modal>
  );
}
