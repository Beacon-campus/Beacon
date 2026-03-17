import { useMemo } from "react";
import Lottie from "lottie-react";
import hourglassAnimation from "../../assets/loading/hourglass.json";
import { funStatusMessages } from "../../utils/loadingMessages";

const SIZE_CLASS = {
  xs: "h-6 w-6",
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-32 w-32",
};

const TEXT_CLASS = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

export default function LoadingState({
  size = "md",
  message,
  className = "",
  messageClassName = "",
  align = "center",
}) {
  const messageText = useMemo(() => {
    if (message) return message;
    const idx = Math.floor(Math.random() * funStatusMessages.length);
    return funStatusMessages[idx] || "Loading...";
  }, [message]);

  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md;
  const textClass = TEXT_CLASS[size] || TEXT_CLASS.md;
  const compact = size === "xs" || size === "sm";

  return (
    <div
      className={`flex flex-col justify-center ${
        align === "center" ? "items-center text-center" : "items-start text-left"
      } ${className}`}
    >
      <div className={sizeClass}>
        <Lottie animationData={hourglassAnimation} loop />
      </div>
      <p
        className={`mt-3 font-semibold text-gray-500 ${textClass} ${
          compact ? "max-w-[220px] leading-snug line-clamp-2" : "max-w-md leading-relaxed"
        } ${messageClassName}`}
      >
        {messageText}
      </p>
    </div>
  );
}
