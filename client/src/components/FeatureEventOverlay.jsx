import { useEffect, useRef } from "react";
import charanGif from "../assets/Feature/1.gif";
import denzilGif from "../assets/Feature/2.gif";
import sahilVideo from "../assets/Feature/3.mp4";
import dukeGif from "../assets/Feature/4.gif";
import charanAudio from "../assets/Feature/Audio/1.mp3";
import denzilAudio from "../assets/Feature/Audio/2.mp3";
import dukeAudio from "../assets/Feature/Audio/4.mp3";

const AUTO_CLOSE_MS = 10000;
const EVENT_MEDIA = {
  charan: {
    visualType: "image",
    visualSrc: charanGif,
    audioSrc: charanAudio,
  },
  denzil: {
    visualType: "image",
    visualSrc: denzilGif,
    audioSrc: denzilAudio,
  },
  sahil: {
    visualType: "video",
    visualSrc: sahilVideo,
    audioSrc: null,
  },
  duke: {
    visualType: "image",
    visualSrc: dukeGif,
    audioSrc: dukeAudio,
  },
};

export default function FeatureEventOverlay({ open, eventKey, onClose }) {
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const media = eventKey ? EVENT_MEDIA[eventKey] : null;

  useEffect(() => {
    if (!open || !media) return;

    const isVideoEvent = media.visualType === "video";

    if (media.audioSrc) {
      audioRef.current = new Audio(media.audioSrc);
      audioRef.current.play().catch(() => {});
    }

    if (!isVideoEvent) {
      timerRef.current = setTimeout(() => {
        onClose?.();
      }, AUTO_CLOSE_MS);
    } else {
      videoRef.current?.play?.().catch(() => {});
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      timerRef.current = null;
      audioRef.current = null;
      videoRef.current = null;
    };
  }, [open, media, onClose]);

  if (!open || !media) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`w-full rounded-2xl bg-white shadow-2xl border border-gray-200 p-4 ${
          media.visualType === "video" ? "max-w-4xl" : "max-w-md"
        }`}
      >
        {media.visualType === "video" ? (
          <video
            ref={videoRef}
            src={media.visualSrc}
            autoPlay
            onEnded={() => onClose?.()}
            playsInline
            className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
          />
        ) : (
          <img
            src={media.visualSrc}
            alt="Feature Event"
            className="w-full h-auto max-h-[70vh] object-contain rounded-xl"
          />
        )}
      </div>
    </div>
  );
}
