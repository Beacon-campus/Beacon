import React, { useState, useEffect, useRef, useCallback } from "react";
import "@excalidraw/excalidraw/index.css";
import {
  Excalidraw,
  MainMenu,
  exportToBlob,
  serializeAsJSON,
  loadFromBlob,
} from "@excalidraw/excalidraw";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase/firebase";
import { loadSketch, saveSketch } from "../services/sketch.service";

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const Whiteboard = () => {
  const { user } = useAuth();
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  // UI States
  const [isTooLarge, setIsTooLarge] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentSize, setCurrentSize] = useState("0.00 KB");
  const [activeToolType, setActiveToolType] = useState("selection"); // Track active tool

  const [isCloudMode, setIsCloudMode] = useState(true);

  // 🧠 MEMORY
  const lastValidElements = useRef([]);
  const lastValidAppState = useRef({});
  const lastSavedDataRef = useRef("");
  const initialLoadDone = useRef(false);
  const checkpointLockedRef = useRef(false);

  const fileInputRef = useRef(null);

  // 🔧 CONFIG
  const MAX_KB = 1024;
  const MAX_SIZE_BYTES = MAX_KB * 1024;

  const getSize = (elements, appState) => {
    const cleanAppState = {
      viewBackgroundColor: appState?.viewBackgroundColor || "#ffffff",
      currentItemStrokeColor: appState?.currentItemStrokeColor || "#000000",
      scrollX: appState?.scrollX || 0,
      scrollY: appState?.scrollY || 0,
      zoom: appState?.zoom || { value: 1 },
    };
    const payload = { elements, appState: cleanAppState };
    const jsonString = JSON.stringify(payload);
    const bytes = new Blob([jsonString]).size;
    return { bytes, jsonString, cleanAppState, kb: (bytes / 1024).toFixed(2) };
  };

  const loadFromCloud = async () => {
    if (!user || !auth.currentUser || !excalidrawAPI) return;
    try {
      setSaving(true);
      const data = await loadSketch();

      excalidrawAPI.updateScene({
        elements: data.elements || [],
        appState: data.appState || {},
        collaborators: [],
      });

      lastValidElements.current = data.elements || [];
      lastValidAppState.current = data.appState || {};

      const { jsonString, kb } = getSize(data.elements || [], data.appState);
      lastSavedDataRef.current = jsonString;
      setCurrentSize(`${kb} KB`);

      setIsCloudMode(true);
      setIsTooLarge(false);
      console.log("☁️ Reloaded from Cloud");
    } catch (err) {
      console.error("Failed to load sketch:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !excalidrawAPI) return;

    try {
      const scene = await loadFromBlob(file, null, null);
      excalidrawAPI.updateScene({
        elements: scene.elements,
        appState: scene.appState,
      });
      setIsCloudMode(false);
    } catch (error) {
      console.error("Error loading file:", error);
      alert("Could not load file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadFile = async () => {
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    const fileData = serializeAsJSON(elements, appState, {}, "local");
    const blob = new Blob([fileData], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-sketch.excalidraw";
    link.click();
  };

  const downloadPNG = async () => {
    if (!excalidrawAPI) return;
    const blob = await exportToBlob({
      elements: excalidrawAPI.getSceneElements(),
      appState: excalidrawAPI.getAppState(),
      files: excalidrawAPI.getFiles(),
      mimeType: "image/png",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-sketch.png";
    link.click();
  };

  const handleReset = () => {
    if (excalidrawAPI && lastValidElements.current) {
      // 1. Get all elements currently on the canvas (including the "bad" one)
      const currentElements = excalidrawAPI.getSceneElements();

      // 2. Create a lookup of IDs that SHOULD be there
      const validIds = new Set(lastValidElements.current.map(el => el.id));

      // 3. Find any element currently on canvas that ISN'T in our valid list
      //    (This catches the huge image that broke things)
      const elementsToDelete = currentElements
        .filter(el => !validIds.has(el.id))
        .map(el => ({ ...el, isDeleted: true }));

      // 4. Update Scene: Restore valid elements AND force-delete the bad ones
      excalidrawAPI.updateScene({
        elements: [...lastValidElements.current, ...elementsToDelete],
        appState: lastValidAppState.current,
        commitToHistory: false
      });

      setIsTooLarge(false);
      checkpointLockedRef.current = false; // 🔓 unlock checkpoint
    }
  };

  const handleClear = () => {
    if (excalidrawAPI) {
      excalidrawAPI.resetScene();
      lastValidElements.current = [];
      lastValidAppState.current = { viewBackgroundColor: "#ffffff" };
      checkpointLockedRef.current = false; // optional safety
    }
  };

  useEffect(() => {
    if (excalidrawAPI && !initialLoadDone.current) {
      loadFromCloud().then(() => {
        initialLoadDone.current = true;
      });
    }
  }, [user, excalidrawAPI]);

  // 🔥 CUSTOM TOOLBAR INJECTOR
  useEffect(() => {
    if (!excalidrawAPI) return;

    const injectLaserButton = () => {
      const toolbarStack = document.querySelector(".App-toolbar .Stack");
      const existingBtn = document.getElementById("custom-laser-btn");

      // Theme Constants
      const COLOR_ACTIVE_BG = "#0f172a";
      const COLOR_ACTIVE_TEXT = "#ffffff";
      const COLOR_INACTIVE_BG = "transparent";
      const COLOR_INACTIVE_TEXT = "#475569";
      const COLOR_HOVER_BG = "#f1f5f9";

      const isActive = activeToolType === "laser";

      if (toolbarStack && !existingBtn) {
        const btn = document.createElement("button");
        btn.id = "custom-laser-btn";
        btn.title = "Laser Pointer — K";
        btn.type = "button";
        btn.className = "ToolIcon__icon";

        Object.assign(btn.style, {
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "0.5rem",
          border: "none",
          cursor: "pointer",
          transition: "background-color 0.2s ease",
          backgroundColor: isActive ? COLOR_ACTIVE_BG : COLOR_INACTIVE_BG,
          color: isActive ? COLOR_ACTIVE_TEXT : COLOR_INACTIVE_TEXT,
        });

        btn.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
          <svg viewBox="0 0 20 20"
               style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round;">
            <g transform="rotate(90 10 10)">
              <path d="m9.644 13.69 7.774-7.773a2.357 2.357 0 0 0-3.334-3.334l-7.773 7.774L8 12l1.643 1.69Z"/>
              <path d="m13.25 3.417 3.333 3.333M10 10l2-2M5 15l3-3M2.156 17.894l1-1M5.453 19.029l-.144-1.407M2.377 11.887l.866 1.118M8.354 17.273l-1.194-.758M.953 14.652l1.408.13"/>
            </g>
          </svg>
          <span id="laser-k-shortcut"
                style="position:absolute;bottom:2px;right:3px;font-size:0.6rem;font-weight:500;opacity:${isActive ? "1" : "0.6"};color:inherit;">
            K
          </span>
        </div>
      `;

        btn.onclick = () => {
          excalidrawAPI.setActiveTool({ type: "laser" });
        };

        btn.onmouseenter = () => {
          if (!isActive) btn.style.backgroundColor = COLOR_HOVER_BG;
        };
        btn.onmouseleave = () => {
          if (!isActive) btn.style.backgroundColor = COLOR_INACTIVE_BG;
        };

        toolbarStack.appendChild(btn);
      }

      // 🔁 UPDATE EXISTING BUTTON (MOST IMPORTANT PART)
      if (existingBtn) {
        existingBtn.style.backgroundColor = isActive
          ? COLOR_ACTIVE_BG
          : COLOR_INACTIVE_BG;
        existingBtn.style.color = isActive
          ? COLOR_ACTIVE_TEXT
          : COLOR_INACTIVE_TEXT;

        // 🔑 FORCE SVG TO REPAINT (THIS FIXES YOUR ISSUE)
        existingBtn.querySelectorAll("svg").forEach((svg) => {
          svg.style.stroke = isActive ? "#ffffff" : "#475569";
          svg.style.fill = "none";
        });

        const kSpan = existingBtn.querySelector("#laser-k-shortcut");
        if (kSpan) {
          kSpan.style.opacity = isActive ? "1" : "0.6";
        }

        existingBtn.onmouseenter = () => {
          if (!isActive) existingBtn.style.backgroundColor = COLOR_HOVER_BG;
        };
        existingBtn.onmouseleave = () => {
          if (!isActive)
            existingBtn.style.backgroundColor = COLOR_INACTIVE_BG;
        };
      }
    };

    injectLaserButton();
    const interval = setInterval(injectLaserButton, 100);
    return () => clearInterval(interval);
  }, [excalidrawAPI, activeToolType]);


  const triggerSave = useCallback(
    debounce(async (elements, appState, jsonString) => {
      if (!auth.currentUser) return;
      if (jsonString === lastSavedDataRef.current) return;

      setSaving(true);
      try {
        const { cleanAppState } = getSize(elements, appState);
        await saveSketch({ elements, appState: cleanAppState });
        lastSavedDataRef.current = jsonString;
        console.log("✅ Auto-Saved");
      } catch (err) {
        console.error("Save failed:", err);
      } finally {
        setSaving(false);
      }
    }, 1000),
    []
  );

  return (
    <div
      className={`w-full h-full overflow-hidden relative tool-${activeToolType}`}
      id="custom-excalidraw"
      // 1. BLOCK KEYBOARD SHORTCUTS (F for Frame, 9 for Image)
      onKeyDownCapture={(e) => {
        // Allow 'f' if user is in "writing mode" (Text tool active OR typing in a textarea)
        const isWriting = activeToolType === "text" || e.target.tagName === "TEXTAREA";

        if (e.key === "9" || (e.key.toLowerCase() === "f" && !isWriting)) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        return false;
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: "none" }}
        accept=".excalidraw,.json"
      />

      {!isCloudMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-amber-50 border border-amber-200 shadow-xl rounded-xl px-5 py-2.5 flex flex-row items-center gap-6 animate-in slide-in-from-top-6 w-fit max-w-[95%]">

          {/* Left: Icon & Text */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-full text-amber-600 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
              <h3 className="text-sm font-bold text-gray-900 whitespace-nowrap">Viewing Local File</h3>
              <p className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline-block">Cloud Sync is disabled. Read-only mode.</p>
            </div>
          </div>

          {/* Right: Button */}
          <button
            onClick={loadFromCloud}
            className="bg-gray-900 hover:bg-black text-white text-xs font-bold py-2 px-4 rounded-lg shadow-md transition-all flex items-center gap-2 transform active:scale-95 whitespace-nowrap"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
            Go back to Cloud Canvas
          </button>
        </div>
      )}

      {isTooLarge && isCloudMode && (
        <div
          className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-50 flex flex-row items-center gap-3 bg-red-50/95 backdrop-blur border border-red-200 shadow-sm rounded-lg px-4 py-2 animate-in slide-in-from-bottom-10 duration-300 overflow-x-auto no-scrollbar"
          style={{ maxWidth: "calc(100% - 360px)" }} // ⚡ Sized to fit between bottom-left and bottom-right controls
        >

          {/* Left Side: Icon & Info */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1 bg-red-100 rounded-full text-red-600 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div className="flex flex-col min-w-0">
              <h4 className="text-[10px] font-bold text-gray-900 whitespace-nowrap uppercase tracking-wide">Storage Full!</h4>
              <p className="text-[10px] text-gray-600 whitespace-nowrap truncate">
                <strong>{currentSize}</strong> / {MAX_KB < 1000 ? `${MAX_KB} KB` : "1 MB"}
              </p>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-px h-6 bg-red-200 shrink-0 mx-1"></div>

          {/* Right Side: Actions (With Full Original Text preserved) */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={downloadFile} className="bg-white border border-gray-300 text-gray-700 py-1 px-2 rounded text-[10px] font-bold hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap">
              Download a local copy
            </button>
            <button onClick={downloadPNG} className="bg-gray-800 text-white border border-transparent py-1 px-2 rounded text-[10px] font-bold hover:bg-black transition-colors shadow-sm whitespace-nowrap">
              Download as PNG
            </button>
            <button onClick={handleReset} className="bg-red-100 text-red-700 border border-red-200 py-1 px-2 rounded text-[10px] font-bold hover:bg-red-200 transition-colors whitespace-nowrap">
              Reset to the last saved state
            </button>
            <button onClick={handleClear} className="text-gray-500 hover:text-red-600 text-[10px] font-bold px-1 transition-colors whitespace-nowrap">
              Clear the canvas
            </button>
          </div>
        </div>
      )}

      {saving && !isTooLarge && isCloudMode && (
        <div className="absolute bottom-4 right-4 z-50 bg-white/80 backdrop-blur text-xs font-medium text-gray-500 px-3 py-1 rounded-full shadow-sm border border-gray-100">
          Saving...
        </div>
      )}

      <style>
        {`
          /* 
            CURSOR FIX FOR WINDOWS: 
            Windows OS flips the standard crosshair color based on contrast. In light mode, it can glitch white-on-white.
            This CSS forces a custom dark SVG crosshair whenever a tool that needs a crosshair is active. 
          */
          #custom-excalidraw:not(.tool-selection):not(.tool-text):not(.tool-eraser):not(.tool-laser):not(.tool-hand) .excalidraw,
          #custom-excalidraw:not(.tool-selection):not(.tool-text):not(.tool-eraser):not(.tool-laser):not(.tool-hand) .excalidraw canvas {
            cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" stroke="%230f172a" stroke-width="2" stroke-linecap="round"/></svg>') 12 12, crosshair !important;
          }
          :root,
          .excalidraw,
          .excalidraw.theme--light {
            --color-primary: #1e293b !important;
            --color-primary-darker: #0f172a !important;
            --color-primary-light: #f8fafc !important;
            --color-primary-light-darker: #e2e8f0 !important;
            --color-brand: #1e293b !important;
            --color-brand-hover: #0f172a !important;
            --color-brand-active: #0f172a !important;
            --color-primary-darkest: #020617 !important; 
            --focus-highlight-color: #0f172a !important; 
            --select-highlight-color: #0f172a !important; 
            --color-surface-primary-container: #0f172a !important;
            --color-on-primary-container: #ffffff !important;
            --color-surface-secondary-container: #e2e8f0 !important;
            --color-on-secondary-container: #020617 !important;
            --color-selection: #a0a0a0 !important;
            --button-hover-bg: #f8fafc !important;
            --color-slider-track: #e2e8f0 !important;
            --color-slider-thumb: #1e293b !important;
            --link-color: #1e293b !important;
          }

          /* 2. COMPLETELY HIDE THE 'MORE TOOLS' DROPDOWN BUTTON */
          [data-testid="dropdown-menu-button"],
          [data-testid="dropdown-menu-button--mobile"],
          button[title="More tools"],
          .App-toolbar__extra-tools-trigger {
            display: none !important;
          }

          /* Hide other specific tools just in case */
          [data-testid="toolbar-frame"],
          [data-testid="toolbar-embeddable"],
          .ToolIcon__icon[aria-label="Frame tool"] {
            display: none !important;
          }
        
          /* Standard UI Cleanup */
          .excalidraw .dropdown-menu-button {
            background-color: #f8fafc !important;
            border-radius: 0.5rem !important;
          }
          .excalidraw .dropdown-menu-button:hover,
          .excalidraw .dropdown-menu-button:active {
            background-color: #e2e8f0 !important;
          }
          .excalidraw .dropdown-menu-button svg {
            fill: #1e293b !important;
          }
        
          /* Base styles for the sliding pill effect */
          .excalidraw .buttonList {
             position: relative;
             z-index: 1;
          }

          /* The Sliding Background Pill Container */
          .excalidraw .ToolIcon__icon,
          .excalidraw .buttonList label {
            background-color: transparent !important; /* Force transparent so pseudoelement behind shows */
            border-color: transparent !important;
            transition: color 0.3s ease-in-out !important;
            position: relative;
            z-index: 2; /* keep text/icon above the pill */
          }
          .excalidraw .ToolIcon__icon svg, 
          .excalidraw .buttonList label svg {
             transition: stroke 0.3s ease-in-out, fill 0.3s ease-in-out !important;
             z-index: 2;
             position: relative;
          }

          /* The sliding Background Pill itself */
          .excalidraw .ToolIcon__icon::before,
          .excalidraw .buttonList label::before {
             content: '';
             position: absolute;
             inset: 0;
             border-radius: 0.5rem;
             background-color: #0f172a;
             opacity: 0;
             transform: scale(0.9);
             transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
             z-index: 1; /* Behind the icon */
          }

          /* Hover State - Soft gray background */
          .excalidraw .ToolIcon:hover .ToolIcon__icon::before,
          .excalidraw .buttonList label:hover::before {
             background-color: #f1f5f9;
             opacity: 1;
             transform: scale(1);
          }

          /* Active State - The Dark Navy */
          .excalidraw .ToolIcon input:checked + .ToolIcon__icon::before,
          .excalidraw .buttonList label.active::before,
          html[dir] .excalidraw .buttonList label.active::before,
          .excalidraw .ToolIcon input:active + .ToolIcon__icon::before,
          .excalidraw .ToolIcon__icon:active::before {
             background-color: #0f172a !important;
             opacity: 1;
             transform: scale(1);
          }
          
          /* Change icon color to white when active */
          .excalidraw .ToolIcon input:checked + .ToolIcon__icon svg,
          .excalidraw .buttonList label.active svg,
          html[dir] .excalidraw .buttonList label.active svg,
          .excalidraw .ToolIcon__icon:active svg {
            stroke: #ffffff !important;
            fill: transparent !important;
            color: #ffffff !important;
          }
          
          /* Hide Library and Help */
          label[title^="Insert image"] { display: none !important; }
          .layer-ui__library,
          .library-button,
          [data-testid="library-button"],
          button[aria-label="Library"],
          .sidebar-trigger,
          .App-toolbar .Stack > .ToolIcon:last-of-type,
          .context-menu,
          .HelpDialog-button {
            display: none !important;
          }
          .HelpDialog h2:first-of-type,
          .HelpDialog a[href^="http"],
          .HelpDialog a[target="_blank"] {
            display: none !important;
          }
          .HelpDialog h3 {
            display: block !important;
          }
        `}
      </style>

      <Excalidraw
        theme="light"
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        uiOptions={{
          tools: {
            image: false,
            frame: false,
            embeddable: false
          }
        }}
        viewModeEnabled={!isCloudMode}
        onChange={(elements, appState) => {
          // 3. Update local state to track active tool (for styling our custom button)
          if (appState.activeTool.type !== activeToolType) {
            setActiveToolType(appState.activeTool.type);
          }

          if (!initialLoadDone.current) return;
          if (!isCloudMode) return;

          const activeElements = elements.filter(el => !el.isDeleted);
          const { bytes, kb, jsonString, cleanAppState } = getSize(activeElements, appState);
          setCurrentSize(`${kb} KB`);

          // 1️⃣ Lock if too large
          if (bytes > MAX_SIZE_BYTES) {
            checkpointLockedRef.current = true;
            setIsTooLarge(true);
            return;
          }

          // 2️⃣ If checkpoint is locked, STOP HERE
          if (checkpointLockedRef.current) {
            setIsTooLarge(false);
            return;
          }

          // 3️⃣ Safe path only
          setIsTooLarge(false);
          lastValidElements.current = activeElements;
          lastValidAppState.current = cleanAppState;
          triggerSave(activeElements, appState, jsonString);

        }}
        initialData={{
          appState: {
            viewBackgroundColor: "#ffffff",
            currentItemStrokeColor: "#000000",
          },
        }}>
        <MainMenu>
          {isCloudMode && (
            <div style={{ padding: "0.5rem 0.75rem", cursor: "default", userSelect: "none" }}>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Canvas Storage</span>
                <div className="flex justify-between items-center text-sm">
                  <span className={`font-medium ${isTooLarge ? "text-red-600" : "text-gray-700"}`}>{currentSize}</span>
                  <span className="text-gray-400 text-xs">/ {MAX_KB < 1000 ? `${MAX_KB} KB` : "1 MB"}</span>
                </div>
                <div className="w-full h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${isTooLarge ? "bg-red-500" : "bg-gray-800"}`} style={{ width: `${Math.min(100, (parseFloat(currentSize) / MAX_KB) * 100)}%` }} />
                </div>
              </div>
            </div>
          )}

          <MainMenu.Separator />
          <MainMenu.Item onSelect={() => fileInputRef.current.click()}>
            Open File (View Only)
          </MainMenu.Item>

          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Export />

        </MainMenu>
      </Excalidraw>
    </div>
  );
};

export default Whiteboard;
