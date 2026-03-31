import { useMemo } from "react";
import { funStatusMessages } from "../../utils/loadingMessages";

const SIZE_MAP = {
  xs: { box: 24,  stroke: 3,  radius: 9,  flash: 2,  text: "text-[10px]" },
  sm: { box: 40,  stroke: 3.5, radius: 15, flash: 3,  text: "text-xs" },
  md: { box: 64,  stroke: 4,  radius: 24, flash: 4,  text: "text-sm" },
  lg: { box: 96,  stroke: 5,  radius: 36, flash: 6,  text: "text-base" },
  xl: { box: 128, stroke: 5,  radius: 48, flash: 8,  text: "text-lg" },
};

/**
 * BeaconSpinner — The SVG-based spinner with:
 *  - Deep Navy (slate-900 / #0F172A) track ring
 *  - Beacon Emerald Green (#7EF640) arc that grows/shrinks
 *  - Amber Gold (#F59E0B) flash dot at center
 *  - Subtle scale pulsation on the whole ring
 */
function BeaconSpinner({ size = "md" }) {
  const cfg = SIZE_MAP[size] || SIZE_MAP.md;
  const { box, stroke, radius, flash } = cfg;
  const center = box / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className="beacon-spinner-container relative"
      style={{ width: box, height: box }}
    >
      {/* Outer glow halo */}
      <div
        className="beacon-glow-ring absolute inset-[-15%] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(126,246,64,0.25) 0%, transparent 70%)`,
        }}
      />

      {/* SVG Spinner */}
      <svg
        className="beacon-spinner-rotation relative z-10"
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        fill="none"
      >
        {/* Track ring — Deep Navy */}
        <circle
          className="beacon-spinner-track"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Animated arc — Beacon Emerald Green */}
        <circle
          className="beacon-spinner-arc"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset="0"
        />
      </svg>

      {/* Center beacon flash — Amber Gold */}
      <div
        className="beacon-flash-dot absolute z-20 rounded-full"
        style={{
          width: flash,
          height: flash,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#F59E0B",
          boxShadow: "0 0 8px 2px rgba(245, 158, 11, 0.6)",
        }}
      />
    </div>
  );
}

export default function LoadingState({
  size = "md",
  message,
  className = "",
  messageClassName = "",
  align = "center",
  fullScreen = false,
}) {
  const messageText = useMemo(() => {
    if (message) return message;
    const idx = Math.floor(Math.random() * funStatusMessages.length);
    return funStatusMessages[idx] || "Loading...";
  }, [message]);

  const cfg = SIZE_MAP[size] || SIZE_MAP.md;
  const compact = size === "xs" || size === "sm";
  const isLarge = size === "md" || size === "lg" || size === "xl";

  // ── Full-screen variant (Task 4) ──────────────────────────
  if (fullScreen) {
    if (className === "minimal") {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#F1F5F9]/20 backdrop-blur-[2px]">
          <BeaconSpinner size="lg" />
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center beacon-mesh-bg">
        {/* Frosted glass card */}
        <div
          className="relative flex flex-col items-center justify-center px-12 py-10 rounded-3xl
                     bg-white/30 border border-white/50 shadow-[0_8px_64px_rgba(0,0,0,0.08)]
                     animate-in fade-in zoom-in-95 duration-500"
          style={{
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
          }}
        >
          <BeaconSpinner size="lg" />

          <h2
            className="mt-6 text-lg font-bold tracking-tight"
            style={{ color: "#0F172A" }}
          >
            Guided Learning Is Loading
          </h2>
          <p className="mt-1.5 text-sm font-medium text-gray-400">
            Connecting to the Beacon campus...
          </p>
        </div>
      </div>
    );
  }

  // ── Standard inline variant ───────────────────────────────
  return (
    <div
      className={`flex flex-col justify-center ${
        align === "center" ? "items-center text-center" : "items-start text-left"
      } ${
        isLarge
          ? "glass-panel bg-white/40 border border-white/60 p-6 md:p-8 rounded-[30px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] m-2 animate-in fade-in zoom-in-95 duration-300"
          : ""
      } ${className}`}
    >
      <BeaconSpinner size={size} />

      <p
        className={`mt-4 font-bold text-gray-700 ${cfg.text} ${
          compact ? "max-w-[200px] leading-snug line-clamp-2 mt-2" : "max-w-[280px] leading-relaxed"
        } ${messageClassName}`}
      >
        {messageText}
      </p>
    </div>
  );
}
