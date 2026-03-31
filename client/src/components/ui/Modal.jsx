import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Global Modal Component
 * 
 * Standardized modal following the "Calendar" reference implementation.
 * - Renders at document.body via Portal
 * - Locks body scroll
 * - Full screen overlay with backdrop blur
 * - Centered content
 * - Supports custom sizing via className, but defaults to large
 */
export default function Modal({ 
  isOpen, 
  onClose, 
  children, 
  className = "",
  overlayClassName = "", // For specific overlay overrides if needed
  backdropClassName = "bg-black/40 backdrop-blur-md" // Default glassmorphism backdrop
}) {
  
  // 1. Handle Scroll Lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // 2. Close on Escape Key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200 ${overlayClassName}`}
      role="dialog"
      aria-modal="true"
    >
        {/* Backdrop */}
        <div 
            className={`absolute inset-0 transition-opacity ${backdropClassName}`}
            onClick={onClose}
            aria-hidden="true"
        />

        {/* Modal Container */}
        <div 
            className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] w-full max-w-6xl ${className}`}
            onClick={(e) => e.stopPropagation()} 
        >
            {children}
        </div>
    </div>,
    document.body
  );
}
