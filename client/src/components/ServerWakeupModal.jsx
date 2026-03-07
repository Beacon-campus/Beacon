import { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import hourglassAnimation from "../assets/loading/hourglass.json";

const funStatusMessages = [
  "The server is baking your dashboard...",
  "Your peers are waiting for you...",
  "Checking if your to-dos say to buy eggs today...",
  "Leonardo da Vinci is currently using your whiteboard...",
  "Waking up the study bots from their digital nap...",
  "Brewing coffee for the Docker containers...",
];

const studyQuotes = [
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "Do not let what you cannot do interfere with what you can do.", author: "John Wooden" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small progress is still progress.", author: "Anonymous" },
];

const VALID_READY_STATUS = new Set([200, 401, 403]);
const WAKE_INTERVAL_MS = 3500;
const MESSAGE_ROTATE_MS = 5000;
const MESSAGE_FADE_MS = 350;

export default function ServerWakeupModal({ children }) {
  const [isAwake, setIsAwake] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [messageVisible, setMessageVisible] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(studyQuotes[0]);

  const nodeApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const dockerBaseUrl =
    import.meta.env.VITE_DOCKER_BASE_URL || "https://streak-api-docker.onrender.com";

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * studyQuotes.length);
    setSelectedQuote(studyQuotes[randomIndex]);
  }, []);

  useEffect(() => {
    if (!nodeApiBaseUrl) {
      return;
    }

    let cancelled = false;

    const pingServers = async () => {
      const nodeUrl = `${nodeApiBaseUrl}/api/calendar/current`;
      const dockerUrl = dockerBaseUrl;

      const results = await Promise.allSettled([
        fetch(nodeUrl, { method: "GET", credentials: "include" }),
        fetch(dockerUrl, { method: "GET", credentials: "include" }),
      ]);

      const [nodeResult, dockerResult] = results;
      const nodeReady =
        nodeResult.status === "fulfilled" &&
        VALID_READY_STATUS.has(nodeResult.value.status);
      const dockerReady =
        dockerResult.status === "fulfilled" &&
        VALID_READY_STATUS.has(dockerResult.value.status);

      if (!cancelled && nodeReady && dockerReady) {
        setIsAwake(true);
      }
    };

    pingServers();
    const intervalId = setInterval(pingServers, WAKE_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [nodeApiBaseUrl, dockerBaseUrl]);

  const isWaking = !isAwake;

  useEffect(() => {
    if (!isWaking) return undefined;

    const intervalId = setInterval(() => {
      setMessageVisible(false);
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % funStatusMessages.length);
        setMessageVisible(true);
      }, MESSAGE_FADE_MS);
    }, MESSAGE_ROTATE_MS);

    return () => clearInterval(intervalId);
  }, [isWaking]);

  const currentMessage = useMemo(() => funStatusMessages[messageIndex], [messageIndex]);

  if (!isWaking) return children;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F4F7FB] overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob"></div>
      <div className="absolute top-[20%] right-[-5%] w-[35%] h-[40%] bg-green-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 flex flex-col items-center justify-center px-4">
        <div className="mb-8 h-72 w-72 md:h-96 md:w-96">
          <Lottie animationData={hourglassAnimation} loop />
        </div>

        <p
          className={`text-center text-2xl md:text-4xl font-bold text-slate-800 transition-opacity duration-300 ${
            messageVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {currentMessage}
        </p>

        <p className="mt-12 text-center text-lg md:text-xl italic text-slate-600 max-w-2xl">
          "{selectedQuote.text}" - {selectedQuote.author}
        </p>
      </div>
    </div>
  );
}
