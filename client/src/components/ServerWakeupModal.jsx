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
  "A Wise man once said...",
  "Sharpening pencils for your assignments...",
  "Convincing the database to remember everything...",
  "Checking if your professor posted a surprise quiz...",
  "Organizing your digital desk...",
  "Counting unread messages from your classmates...",
  "Your AI study buddy is stretching before helping...",
  "Aligning the whiteboard markers...",
  "Looking for motivation in the syllabus...",
  "Loading your brain cells into RAM...",
  "Dusting off the lecture notes...",
  "Syncing brains across the campus network...",
  "Reading the fine print of your assignment deadlines...",
  "Preparing a seat in the front row...",
  "Teaching the server how to pass exams...",
  "Searching the library for lost ideas...",
  "Charging the productivity batteries...",
  "Waiting for inspiration to connect...",
  "Checking if the group project is still alive...",
  "Opening 37 browser tabs for research...",
  "Making sure your notes are still where you left them...",
  "Your classmates are probably procrastinating too...",
  "Finding where you saved that one important note...",
  "The AI bot is putting on its thinking hat...",
  "Compiling knowledge...",
  "Making sure the campus WiFi gods are happy...",
  "Polishing your dashboard for maximum productivity...",
  "The study bots are forming a study group...",
  "Verifying that coffee levels are optimal...",
  "Looking for that one missing semicolon...",
  "Reassuring the database that exams will be okay..."
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

const VALID_READY_STATUS = new Set([200, 401, 403, 429, 502, 503]);
const WAKE_INTERVAL_MS = 3500;
const MESSAGE_ROTATE_MS = 5000;
const MESSAGE_FADE_MS = 350;

export default function ServerWakeupModal({ children }) {
  const [isAwake, setIsAwake] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [messageVisible, setMessageVisible] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(studyQuotes[0]);
  const [nodeProbeStatus, setNodeProbeStatus] = useState("loading");
  const [dockerProbeStatus, setDockerProbeStatus] = useState("loading");

  const nodeApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const dockerBaseUrl = import.meta.env.VITE_DOCKER_BASE_URL;

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * studyQuotes.length);
    setSelectedQuote(studyQuotes[randomIndex]);
  }, []);

  useEffect(() => {
    if (!nodeApiBaseUrl || !dockerBaseUrl || isAwake) {
      return;
    }

    let cancelled = false;

    const pingServers = async () => {
      if (isAwake) return;

      const nodeBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const dockerServiceBaseUrl = import.meta.env.VITE_DOCKER_BASE_URL;
      if (!nodeBaseUrl || !dockerServiceBaseUrl) return;

      const nodeUrl = `${nodeBaseUrl.replace(/\/api$/, "")}/health`;
      const dockerUrl = `${dockerServiceBaseUrl.replace(/\/+$/, "")}/health`;

      const results = await Promise.allSettled([
        fetch(nodeUrl, { method: "GET" }),
        fetch(dockerUrl, { method: "GET" }),
      ]);

      const [nodeResult, dockerResult] = results;
      console.log("[ServerWakeupModal] Ping URLs:", { nodeUrl, dockerUrl });
      console.log("[ServerWakeupModal] Ping raw results:", {
        nodeResult,
        dockerResult,
      });
      const nodeStatus =
        nodeResult.status === "fulfilled" ? nodeResult.value.status : null;
      const dockerStatus =
        dockerResult.status === "fulfilled" ? dockerResult.value.status : null;
      console.log("[ServerWakeupModal] Node status code:", nodeStatus);
      console.log("[ServerWakeupModal] Docker status code:", dockerStatus);
      const nodeReady =
        nodeResult.status === "fulfilled" &&
        VALID_READY_STATUS.has(nodeResult.value.status);
      const dockerReady =
        dockerResult.status === "fulfilled" &&
        VALID_READY_STATUS.has(dockerResult.value.status);
      console.log("[ServerWakeupModal] Ping readiness:", {
        nodeReady,
        dockerReady,
      });
      console.log("[ServerWakeupModal] nodeReady:", nodeReady);
      console.log("[ServerWakeupModal] dockerReady:", dockerReady);
      if (nodeReady) {
        console.log("render-node: ok");
      }
      if (dockerReady) {
        console.log("render-docker: ok");
      }

      if (!cancelled) {
        setNodeProbeStatus(nodeReady ? "up" : "down");
        setDockerProbeStatus(dockerReady ? "up" : "down");
      }

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
  }, [nodeApiBaseUrl, dockerBaseUrl, isAwake]);

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
  const bothServicesReady = nodeProbeStatus === "up" && dockerProbeStatus === "up";

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
          className={`text-center text-2xl md:text-4xl font-bold text-slate-800 transition-opacity duration-300 ${messageVisible ? "opacity-100" : "opacity-0"
            }`}
        >
          {currentMessage}
        </p>

        <p className="mt-12 text-center text-lg md:text-xl italic text-slate-600 max-w-2xl">
          "{selectedQuote.text}" - {selectedQuote.author}
        </p>

        <button
          type="button"
          onClick={() => setIsAwake(true)}
          className="mt-8 rounded-full bg-white/70 px-6 py-2 text-sm font-semibold text-slate-800 border border-white/80 shadow-sm hover:bg-white transition-colors"
        >
          Skip
        </button>
      </div>

      <div className="fixed bottom-5 right-5 z-20 flex flex-col items-end gap-1.5 text-xs font-semibold font-mono text-slate-700">
        <div className="flex items-center gap-2">
          <span>Render Node</span>
          {nodeProbeStatus === "loading" && (
            <span className="h-2.5 w-2.5 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
          )}
          {nodeProbeStatus === "up" && <span className="text-green-600">✓</span>}
          {nodeProbeStatus === "down" && <span className="text-red-500">•</span>}
        </div>

        <div className="flex items-center gap-2">
          <span>Render Docker</span>
          {dockerProbeStatus === "loading" && (
            <span className="h-2.5 w-2.5 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
          )}
          {dockerProbeStatus === "up" && <span className="text-green-600">✓</span>}
          {dockerProbeStatus === "down" && <span className="text-red-500">•</span>}
        </div>

        {bothServicesReady && (
          <div className="mt-1 flex items-center gap-2 text-green-700">
            <span>Green Light</span>
            <span>✓</span>
          </div>
        )}
      </div>
    </div>
  );
}
