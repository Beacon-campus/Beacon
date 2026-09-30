import { useState, useEffect } from "react";
import { LayoutSkeleton } from "./ui/LayoutSkeleton";

const VALID_READY_STATUS = new Set([200, 401, 403, 429, 502, 503]);
const WAKE_INTERVAL_MS = 5000;

export default function ServerWakeupModal({ children }) {
  const [isAwake, setIsAwake] = useState(false);
  const [apiProbeStatus, setApiProbeStatus] = useState("loading");

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (isAwake) return;

    let cancelled = false;
    let timeoutId;
    let probeInFlight = false;
    const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
      const controller = new AbortController();
      const requestTimeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, {
          method: "GET",
          signal: controller.signal,
          ...options,
        });
      } finally {
        clearTimeout(requestTimeoutId);
      }
    };

    const pingApi = async () => {
      if (isAwake || cancelled || probeInFlight) return;
      if (!apiBaseUrl) {
        if (!cancelled) setApiProbeStatus("down");
        return;
      }
      probeInFlight = true;
      const apiHealthUrl = `${apiBaseUrl.replace(/\/api$/, "")}/health`;
      if (!cancelled) setApiProbeStatus("loading");
      try {
        const response = await fetchWithTimeout(
          `${apiHealthUrl}?wake=${Date.now()}`,
        );
        const ready = VALID_READY_STATUS.has(response.status);
        if (!cancelled) {
          setApiProbeStatus(ready ? "up" : "down");
          if (ready) setIsAwake(true);
        }
      } catch {
        if (!cancelled) setApiProbeStatus("down");
      } finally {
        probeInFlight = false;
        if (!cancelled && !isAwake) {
          timeoutId = setTimeout(pingApi, WAKE_INTERVAL_MS);
        }
      }
    };

    pingApi();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [apiBaseUrl, isAwake]);

  const isWaking = !isAwake;
  const serviceReady = apiProbeStatus === "up";

  return (
    <>
      {children}

      {!isWaking ? null : (
        <>
          {/* Background (Skeleton) */}
          <div className="fixed inset-0 z-[100] bg-slate-100/80 backdrop-blur-sm">
            <LayoutSkeleton />
          </div>

          {/* Overlays for Server Management */}
          <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/5 pointer-events-none">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-2xl flex flex-col items-center gap-6 pointer-events-auto transform transition-all animate-in slide-in-from-bottom-4 duration-500">
              <div className="text-center">
                <h1 className="text-2xl font-black text-slate-800 mb-2">
                  Connecting to Beacon
                </h1>
                <p className="text-sm font-medium text-slate-500">
                  Wait a few seconds while we warm up the server...
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAwake(true)}
                className="rounded-full bg-slate-900 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:bg-slate-800 transition-all active:scale-95">
                Skip & Enter App
              </button>
            </div>
          </div>

          <div className="fixed bottom-6 right-8 z-[120] flex items-center gap-3 py-2 px-4 rounded-full bg-white/60 backdrop-blur-md border border-white/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">
              Render API
            </span>
            <div className="relative flex h-3 w-3 items-center justify-center">
              {apiProbeStatus === "loading" && (
                <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${apiProbeStatus === "up" ? "bg-green-500" : apiProbeStatus === "loading" ? "bg-amber-500" : "bg-red-500"}`}
              />
            </div>
            {serviceReady && (
              <span className="text-[10px] font-bold text-green-600/80 uppercase tracking-tighter">
                Live
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}
