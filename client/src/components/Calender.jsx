import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useHomeData } from "../context/HomeDataContext";
import apiClient from "../services/apiClient";
import { getOrFetchPageCache } from "../services/pageCache.service";
import jsPDF from "jspdf";
import Modal from "./ui/Modal";
import { exportRowsToXlsx } from "../utils/excelExport";
import { buildCloudinaryUrl } from "../utils/cloudinaryUrl";
import LoadingState from "./ui/LoadingState";

// --- Icons ---
const DownloadIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>;
const ClockIcon = () => <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
const CalendarIconSmall = () => <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>;
const CalendarIconLarge = () => <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>;
const ZoomInIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>;
const ZoomOutIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM5 10h10"></path></svg>;
const ResetIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>;
const MoonIcon = () => <svg className="w-10 h-10 text-indigo-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>;
const CoffeeIcon = ({ className = "w-4 h-4" }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"></path></svg>;

// --- Glitch Text Component ---
const GlitchText = ({ text, className = "" }) => (
  <span className={`relative inline-block ${className}`}>
    <span className="relative z-10">{text}</span>
    <span className="absolute top-0 left-0 -translate-x-[0.5px] text-red-500 opacity-60 z-0 animate-pulse mix-blend-screen overflow-hidden whitespace-nowrap">{text}</span>
    <span className="absolute top-0 left-0 translate-x-[0.5px] text-blue-500 opacity-60 z-0 animate-pulse mix-blend-screen delay-75 overflow-hidden whitespace-nowrap">{text}</span>
  </span>
);


export default function Calendar() {
  const { user } = useAuth();
  const { calendarCurrent, fetchCalendarCurrent, todos, fetchTodos } = useHomeData();
  const userCacheKey = user?.uid || "guest";
  const [now, setNow] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [blink, setBlink] = useState(false);

  // --- Data State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeCell, setActiveCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // --- Toggle & Image State ---
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "calendar"
  const [cachedImages, setCachedImages] = useState({ odd: null, even: null, isLoading: false });

  // --- Zoom State ---
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imageFetchInFlightRef = useRef(false);

  // --- Timetable State ---
  const [fullSchedule, setFullSchedule] = useState([]);
  const [timetableState, setTimetableState] = useState("loading");
  const [classCards, setClassCards] = useState({ now: null, next: null, later: null });
  const [nextClassInfo, setNextClassInfo] = useState(null);
  const timetableFetchRef = useRef({ key: null, inFlight: false });

  const toDateKey = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
      // For plain date strings, keep exact day. For ISO datetime, use local date.
      const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const calendarData = calendarCurrent;
  const upcomingEvents = Array.isArray(calendarData?.upcomingEvents) ? calendarData.upcomingEvents : [];

  const timetableQuery = useMemo(() => {
    if (!user) return null;
    const shift = user.shift || user.profile?.shift;
    if (!shift) return null;

    if (user.role === "teacher") {
      const department = user.department || user.profile?.department;
      if (!department) return null;
      return {
        key: `calendar:timetable:teacher:${department}:${shift}`,
        params: { department, shift },
      };
    }

    const course = user.course || user.profile?.course;
    const semester = user.semester || user.profile?.semester;
    if (!course || !semester) return null;
    return {
      key: `calendar:timetable:student:${course}:${semester}:${shift}`,
      params: { course, semester, shift },
    };
  }, [user]);

  const userTodos = useMemo(() => {
    const list = Array.isArray(todos) ? todos : [];
    const currentUid = user?.uid;
    const scopedTodos = currentUid
      ? list.filter((t) => !t?.userId || t.userId === currentUid || t.uid === currentUid)
      : list;
    return scopedTodos.map((t) => ({
      ...t,
      __dueDateKey: toDateKey(t?.dueDate),
    }));
  }, [todos, user?.uid]);

  const fetchCalendarAndTodos = useCallback(async (force = false) => {
    if (!user) return;

    try {
      await fetchCalendarCurrent(force);
    } catch (err) {
      console.error("Failed to fetch calendar", err);
    }

    try {
      await fetchTodos(force);
    } catch (err) {
      console.error("Failed to fetch todos", err);
    }
  }, [user, fetchCalendarCurrent, fetchTodos]);


  // --- Clock Logic ---
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      setBlink((prev) => !prev);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        await fetchCalendarAndTodos();
      } catch {
        // Calendar + todos fetch error only.
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, fetchCalendarAndTodos]);

  useEffect(() => {
    if (!user) return;
    if (!timetableQuery) {
      setFullSchedule([]);
      setTimetableState("error");
      return;
    }
    if (timetableFetchRef.current.inFlight) return;
    if (timetableFetchRef.current.key === timetableQuery.key) return;

    timetableFetchRef.current.key = timetableQuery.key;
    timetableFetchRef.current.inFlight = true;
    setTimetableState("loading");

    const fetchTimetable = async () => {
      try {
        const query = new URLSearchParams(timetableQuery.params);
        const result = await getOrFetchPageCache(
          timetableQuery.key,
          userCacheKey,
          async () => (await apiClient.get(`/timetable/weekly?${query}`)).data,
          { ttlMs: 60_000 }
        );

        if (!result || result.exists === false) {
          setFullSchedule([]);
          setTimetableState("missing");
          return;
        }

        const schedule = Array.isArray(result.schedule)
          ? result.schedule
          : Array.isArray(result)
            ? result
            : [];
        setFullSchedule(schedule || []);
        if (!schedule || schedule.length === 0) {
          setTimetableState("missing");
        }
      } catch {
        setTimetableState("error");
      } finally {
        timetableFetchRef.current.inFlight = false;
      }
    };

    fetchTimetable();
  }, [user, timetableQuery?.key, userCacheKey]);

  useEffect(() => {
    if (!showCalendar) return;
    fetchCalendarAndTodos(true).catch(() => { });
  }, [showCalendar, fetchCalendarAndTodos]);

  useEffect(() => {
    const handleTodosChanged = () => {
      fetchTodos(true).catch(() => { });
    };
    window.addEventListener("todos:changed", handleTodosChanged);
    return () => window.removeEventListener("todos:changed", handleTodosChanged);
  }, [fetchTodos]);

  useEffect(() => {
    if (!showCalendar) return;
    const intervalId = setInterval(() => {
      fetchCalendarAndTodos(true).catch(() => { });
    }, 60000);
    return () => clearInterval(intervalId);
  }, [showCalendar, fetchCalendarAndTodos]);

  // --- Timetable Logic ---
  useEffect(() => {
    if (fullSchedule.length === 0) return;

    const daysMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDayIndex = now.getDay();
    const currentDayName = daysMap[currentDayIndex];
    const currentTimeMins = now.getHours() * 60 + now.getMinutes();

    const parseTime = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const todaySchedule = fullSchedule.find(s => s.day === currentDayName);
    const todaySlots = todaySchedule ? todaySchedule.slots : [];

    const activeIndex = todaySlots.findIndex(slot => {
      const start = parseTime(slot.startTime);
      const end = parseTime(slot.endTime);
      return currentTimeMins >= start && currentTimeMins < end;
    });

    const nextIndexToday = todaySlots.findIndex(slot => parseTime(slot.startTime) > currentTimeMins);

    if (activeIndex !== -1) {
      setTimetableState("active");
      let nowSlot = todaySlots[activeIndex];
      let nextIdx = activeIndex + 1;
      let nextSlot = nextIdx < todaySlots.length ? todaySlots[nextIdx] : null;
      let laterIdx = nextIdx + 1;
      let laterSlot = laterIdx < todaySlots.length ? todaySlots[laterIdx] : null;
      setClassCards({ now: nowSlot, next: nextSlot, later: laterSlot });

    } else if (nextIndexToday !== -1) {
      setTimetableState("active");
      let nextSlot = todaySlots[nextIndexToday];
      let laterIdx = nextIndexToday + 1;
      let laterSlot = laterIdx < todaySlots.length ? todaySlots[laterIdx] : null;

      let breakStartTime = "Now";
      if (nextIndexToday > 0) {
        breakStartTime = todaySlots[nextIndexToday - 1].endTime;
      }

      const breakSlot = {
        subject: "Short Break",
        startTime: breakStartTime,
        endTime: nextSlot.startTime,
        type: "Interval"
      };
      setClassCards({ now: breakSlot, next: nextSlot, later: laterSlot });

    } else {
      setTimetableState("ended");
      let foundNextClass = null;
      for (let i = 1; i <= 7; i++) {
        const checkDayIndex = (currentDayIndex + i) % 7;
        const checkDayName = daysMap[checkDayIndex];
        const daySchedule = fullSchedule.find(s => s.day === checkDayName);
        if (daySchedule && daySchedule.slots.length > 0) {
          foundNextClass = { day: checkDayName, ...daySchedule.slots[0] };
          break;
        }
      }
      setNextClassInfo(foundNextClass);
    }
  }, [now, fullSchedule]);

  // --- Formatting ---
  const hours24 = now.getHours();
  const hours12 = hours24 % 12 || 12;
  const hoursString = hours12.toString().padStart(2, '0');
  const minutesString = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const dateOptions = { day: '2-digit', month: 'short', weekday: 'long' };
  const formattedDate = now.toLocaleDateString('en-GB', dateOptions).replace(',', '');

  const getDotColor = (type) => {
    if (type === "Exam") return "bg-amber-500";
    if (type === "Community" || type === "Event" || type === "Holiday") return "bg-emerald-500";
    return "bg-slate-900";
  };

  const getEventBorderColor = (type) => {
    if (type === "Exam") return "border-l-amber-500";
    if (type === "Community" || type === "Event" || type === "Holiday") return "border-l-emerald-500";
    return "border-l-slate-900";
  };

  const calendarEvents = Array.isArray(calendarData?.events)
    ? calendarData.events
    : Array.isArray(calendarData?.upcomingEvents)
      ? calendarData.upcomingEvents
      : [];
  const activeGridTodos = userTodos.filter((t) => t?.dueDate && t?.completed !== true);
  const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "drfqhnjqm";
  const CLOUDINARY_ODD_FALLBACK = `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/calendar/odd-sem.png`;
  const CLOUDINARY_EVEN_FALLBACK = `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/calendar/even-sem.png`;
  const LOCAL_ODD_FALLBACK = "/calendar/odd-sem.png";
  const LOCAL_EVEN_FALLBACK = "/calendar/even-sem.png";

  const normalizeUrlCandidates = (urls) =>
    [...new Set((urls || []).filter((u) => typeof u === "string" && u.trim().length > 0))];

  const oddSemUrlCandidates = useMemo(() => {
    const cloudinaryCandidate = calendarData?.oddSemCloudinary
      ? (calendarData.oddSemCloudinary.secureUrl
        || buildCloudinaryUrl({
          publicId: calendarData.oddSemCloudinary.publicId,
          version: calendarData.oddSemCloudinary.version,
          resourceType: calendarData.oddSemCloudinary.resourceType || "image",
        }))
      : null;
    return normalizeUrlCandidates([
      cloudinaryCandidate,
      calendarData?.oddSemUrl,
      ...(Array.isArray(calendarData?.oddSemUrlCandidates) ? calendarData.oddSemUrlCandidates : []),
      CLOUDINARY_ODD_FALLBACK,
      LOCAL_ODD_FALLBACK
    ]);
  }, [calendarData, CLOUDINARY_ODD_FALLBACK]);

  const evenSemUrlCandidates = useMemo(() => {
    const cloudinaryCandidate = calendarData?.evenSemCloudinary
      ? (calendarData.evenSemCloudinary.secureUrl
        || buildCloudinaryUrl({
          publicId: calendarData.evenSemCloudinary.publicId,
          version: calendarData.evenSemCloudinary.version,
          resourceType: calendarData.evenSemCloudinary.resourceType || "image",
        }))
      : null;
    return normalizeUrlCandidates([
      cloudinaryCandidate,
      calendarData?.evenSemUrl,
      ...(Array.isArray(calendarData?.evenSemUrlCandidates) ? calendarData.evenSemUrlCandidates : []),
      CLOUDINARY_EVEN_FALLBACK,
      LOCAL_EVEN_FALLBACK
    ]);
  }, [calendarData, CLOUDINARY_EVEN_FALLBACK]);

  const fetchBlobWithTimeout = async (url, timeoutMs = 12000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.blob();
    } finally {
      clearTimeout(timer);
    }
  };

  const fetchFirstAvailableBlob = async (candidates) => {
    let lastError = null;
    for (const url of candidates) {
      try {
        const blob = await fetchBlobWithTimeout(url);
        return { blob, url };
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("No image URL candidates available");
  };

  const handleDownloadRawPdf = async () => {
    if (!calendarData || isDownloading) return;
    setIsDownloading(true);
    setShowExportMenu(false);

    try {
      const blobToDataUrl = async (blob) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      const [{ blob: oddBlob }, { blob: evenBlob }] = await Promise.all([
        fetchFirstAvailableBlob(oddSemUrlCandidates),
        fetchFirstAvailableBlob(evenSemUrlCandidates),
      ]);
      const [imgOdd, imgEven] = await Promise.all([
        blobToDataUrl(oddBlob),
        blobToDataUrl(evenBlob),
      ]);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const addImageToPage = (imgData) => {
        const isJpeg = typeof imgData === "string" && imgData.startsWith("data:image/jpeg");
        pdf.addImage(imgData, isJpeg ? "JPEG" : "PNG", 0, 0, pageWidth, pageHeight, '', 'FAST');
      };
      addImageToPage(imgOdd);
      pdf.addPage();
      addImageToPage(imgEven);
      pdf.save(`College_Calendar_Original.pdf`);
    } catch (error) {
      console.error("Error creating PDF:", error);
      alert("Failed to create raw PDF. Please check calendar image URL availability.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!calendarData || isDownloading) return;
    setIsDownloading(true);
    setShowExportMenu(false);

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const margin = 20;
      let y = 20;

      // Header
      pdf.setFontSize(22);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Full Semester Schedule", margin, y);
      y += 5;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, y, 190, y);
      y += 10;

      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Academic Year: ${calendarData.academicYear || '2025-2026'}`, margin, y);
      y += 15;

      // Merge and Sort Data (Mirroring Excel Logic)
      const academicEvents = calendarEvents.map(e => ({
        date: new Date(e.date),
        type: e.type,
        title: e.title,
        category: "Academic"
      }));

      const todos = userTodos.map(t => ({
        date: t.dueDate ? new Date(t.dueDate) : null,
        type: "TO-DO",
        title: t.title,
        category: "Personal"
      }));

      const allItems = [...academicEvents, ...todos].sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date - b.date;
      });

      // Render Table-like Grid
      pdf.setFontSize(10);

      allItems.forEach((item) => {
        // Page overflow check
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }

        const dateStr = item.date ? item.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "No Date";

        // Background for category separation
        if (item.category === "Academic") {
          pdf.setFillColor(245, 248, 255); // Light blue-ish academic
        } else {
          pdf.setFillColor(248, 248, 248); // Very light grey personal
        }

        pdf.roundedRect(margin, y, 170, 10, 1, 1, 'F');

        // Date & Category Label
        pdf.setTextColor(80, 80, 80);
        pdf.setFont(undefined, 'bold');
        pdf.text(dateStr, margin + 4, y + 6.5);

        // Title & Type
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
        pdf.text(`[${item.type}]`, margin + 35, y + 6.5);

        pdf.setFont(undefined, 'bold');
        const displayTitle = item.title.length > 50 ? item.title.substring(0, 47) + "..." : item.title;
        pdf.text(displayTitle, margin + 65, y + 6.5);

        y += 13;
      });

      pdf.save(`Schedule_Full_${calendarData.academicYear || 'Export'}.pdf`);
    } catch (error) {
      console.error("? PDF EXPORT ERROR:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!calendarData) return;
    setShowExportMenu(false);

    // Combine Events and Todos
    const academicEvents = calendarEvents.map(e => ({
      Date: new Date(e.date).toLocaleDateString('en-GB'),
      Type: e.type,
      Title: e.title,
      Description: e.description || "",
      Category: "Academic"
    }));

    const todos = userTodos.map(t => ({
      Date: t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-GB') : "No Date",
      Type: "TO-DO",
      Title: t.title,
      Description: t.description || "",
      Category: "Personal"
    }));

    const allData = [...academicEvents, ...todos].sort((a, b) => {
      // Basic string sort for dates (DD/MM/YYYY) is poor, but fine for an overview
      return a.Date.localeCompare(b.Date);
    });

    await exportRowsToXlsx({
      rows: allData,
      sheetName: "Schedule",
      fileName: `Schedule_${calendarData?.academicYear || "Export"}.xlsx`,
      columns: [
        { header: "Date", key: "Date", width: 15 },
        { header: "Type", key: "Type", width: 12 },
        { header: "Title", key: "Title", width: 30 },
        { header: "Description", key: "Description", width: 40 },
        { header: "Category", key: "Category", width: 12 },
      ],
    });
  };

  // --- Image Fetching & Zoom Logic ---
  const fetchImages = useCallback(async () => {
    if (!calendarData) return;
    if (cachedImages.isLoading || imageFetchInFlightRef.current) return;
    if (cachedImages.odd && cachedImages.even) return;

    imageFetchInFlightRef.current = true;
    setCachedImages(prev => ({ ...prev, isLoading: true }));
    try {
      const [{ blob: oddBlob }, { blob: evenBlob }] = await Promise.all([
        fetchFirstAvailableBlob(oddSemUrlCandidates),
        fetchFirstAvailableBlob(evenSemUrlCandidates),
      ]);
      const oddUrl = URL.createObjectURL(oddBlob);
      const evenUrl = URL.createObjectURL(evenBlob);
      setCachedImages({ odd: oddUrl, even: evenUrl, isLoading: false });
    } catch (err) {
      console.error("Failed to fetch calendar images:", err);
      setCachedImages({
        // Hard fallback to bundled local assets if all remote candidates fail.
        odd: LOCAL_ODD_FALLBACK,
        even: LOCAL_EVEN_FALLBACK,
        isLoading: false
      });
    } finally {
      imageFetchInFlightRef.current = false;
    }
  }, [calendarData, cachedImages.odd, cachedImages.even, cachedImages.isLoading, oddSemUrlCandidates, evenSemUrlCandidates]);

  useEffect(() => {
    if (viewMode === "calendar") {
      fetchImages();
    }
  }, [viewMode, fetchImages]);

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  const resetZoom = () => { setZoomLevel(1); setPan({ x: 0, y: 0 }); };
  const handleMouseDown = (e) => { e.preventDefault(); setIsDragging(true); dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; };
  const handleMouseMove = (e) => { if (!isDragging) return; e.preventDefault(); setPan({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y }); };
  const handleMouseUp = () => { setIsDragging(false); };

  useEffect(() => {
    if (!showCalendar) {
      setZoomLevel(1); setPan({ x: 0, y: 0 });
      setViewMode("grid"); // Reset to grid when modal closes
    }
  }, [showCalendar]);


  const renderClassCard = (item, label, isActive = false) => {
    if (!item) {
      return (
        <div className="flex-1 min-w-[130px] bg-[#F3F4F6] rounded-xl p-3 flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</span>
          <div className="text-gray-300 my-1"><CoffeeIcon className="w-5 h-5" /></div>
          <p className="text-sm font-semibold text-gray-400">No Class</p>
        </div>
      );
    }

    if (item.type === "Interval" || item.type === "Break") {
      return (
        <div className="flex-1 min-w-[130px] border-2 border-dashed border-amber-300 bg-amber-100 rounded-xl p-3 flex flex-col justify-center items-center text-center relative overflow-hidden shadow-sm">
          <div className="flex items-center gap-1 mb-2">
            <CoffeeIcon />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">{label}</span>
          </div>
          <p className="text-lg font-extrabold text-amber-900 leading-tight">{item.subject}</p>
          <p className="text-sm font-bold text-amber-700 mt-1 font-mono">{item.startTime} - {item.endTime}</p>
        </div>
      );
    }

    return (
      <div className={`flex-1 min-w-[130px] border-none rounded-xl p-3 flex flex-col relative group transition-all ${isActive ? "bg-[#F0FDF4] shadow-lg shadow-[#059669]/10 z-10 transform scale-[1.02]" : "bg-white border border-gray-100 shadow-sm text-gray-700"}`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isActive ? "text-[#065F46]" : "text-gray-400"}`}>{label}</span>
          <span className={`text-[9px] px-1.5 py-0.5 font-bold border rounded-md ${isActive ? "bg-white/60 text-[#065F46] border-[#059669]/20" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
            {item.type}
          </span>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center text-center gap-1 min-h-[3rem]">
          <p className={`text-lg font-extrabold leading-tight line-clamp-2 ${isActive ? "text-[#065F46]" : "text-gray-700"}`}>
            {item.subject}
          </p>
          <p className={`text-xs font-bold line-clamp-1 ${isActive ? "text-[#065F46]/70" : "text-gray-500"}`}>
            {item.teacher}
          </p>
        </div>
        <div className={`mt-2 text-center border-t ${isActive ? 'border-[#059669]/10' : 'border-gray-100'} pt-2`}>
          <p className={`text-sm font-bold font-mono ${isActive ? "text-[#065F46]" : "text-gray-500"}`}>
            {item.startTime} - {item.endTime}
          </p>
        </div>
        {isActive && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#059669] animate-pulse shadow-sm"></span>}
      </div>
    );
  };

  return (
    <div className="h-full w-full p-2">

      <div className="h-full w-full premium-card p-6 flex overflow-hidden">

        {/* LEFT SIDE */}
        <div className="flex-1 flex flex-col gap-8 h-full overflow-hidden pr-6 border-r border-gray-50">

          {/* TODAY CARD */}
          <div className="flex-1 flex flex-col relative overflow-hidden transition-all duration-300 shrink-0">

            <div className="flex items-center mb-6 relative z-10 gap-3">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <ClockIcon /> Today
              </h2>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
              <span className="text-lg font-bold text-primary">
                {hoursString}<span className={`transition-opacity duration-400 ${blink ? "opacity-40" : "opacity-100"}`}>:</span>{minutesString} <span className="text-sm font-medium">{ampm}</span>
              </span>
            </div>

            {user && timetableState === "active" && (
              <div className="flex gap-4 flex-wrap relative z-10 h-full">
                {renderClassCard(classCards.now, "Now", true)}
                {renderClassCard(classCards.next, "Next")}
                {renderClassCard(classCards.later, "Later")}
              </div>
            )}

            {user && timetableState === "ended" && (
              <div className="flex-1 flex flex-col items-center justify-evenly text-center relative z-10 animate-in fade-in slide-in-from-bottom-2 h-full">
                <div>
                  <div className="inline-flex p-3 bg-indigo-50 mb-2 rounded-xl">
                    <MoonIcon />
                  </div>
                  <h3 className="text-lg font-bold text-primary">Classes concluded for today</h3>
                </div>

                {nextClassInfo ? (
                  <div className="flex flex-col items-center gap-2 w-full px-2">
                    <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-widest">RESUMING</span>
                    <div className="flex items-center justify-between gap-4 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-full max-w-[280px]">
                      <div className="text-right flex-1">
                        <p className="text-sm font-bold text-primary leading-tight">{nextClassInfo.day}</p>
                        <p className="text-xs text-indigo-500 font-medium">{nextClassInfo.startTime}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200"></div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-bold text-primary leading-tight truncate">{nextClassInfo.subject}</p>
                        <p className="text-xs text-gray-400">Lecture</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No upcoming classes found this week.</p>
                )}
              </div>
            )}

            {user && timetableState === "missing" && (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-white/50 gap-2">
                <p className="text-sm text-gray-500 font-medium">No timetable published yet.</p>
                <p className="text-xs text-gray-400">Ask admin to upload the schedule when ready.</p>
              </div>
            )}

            {(!user || timetableState === "error") && (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-white/50 gap-2">
                <p className="text-sm text-gray-500 font-medium">Timetable not available.</p>
                <p className="text-xs text-gray-400">Ask admin to upload schedule for {user?.course || "your course"}.</p>
              </div>
            )}
          </div>

          {/* UPCOMING EVENTS */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <CalendarIconSmall /> Upcoming Events
              </h2>
              <span className="text-sm font-medium text-gray-600 bg-white px-3 py-1 border border-gray-200 shadow-sm rounded-lg">{formattedDate}</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <LoadingState size="sm" />
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="flex flex-col gap-2 overflow-y-auto pr-1 soft-scrollbar min-h-0 flex-1">
                {upcomingEvents.map((event, i) => {
                  const eventDate = new Date(event.date);
                  eventDate.setHours(0, 0, 0, 0);
                  const todayRef = new Date(now);
                  todayRef.setHours(0, 0, 0, 0);
                  const diffTime = eventDate - todayRef;
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  let displayDate = event.dateString;
                  // Standardized neutral styling for general future events
                  let badgeColor = "bg-gray-100 border-gray-200 text-gray-700";

                  if (diffDays === 0) {
                    displayDate = "Today";
                    badgeColor = "bg-red-50 border-red-100 text-red-700";
                  } else if (diffDays === 1) {
                    displayDate = "Tomorrow";
                    badgeColor = "bg-indigo-50 border-indigo-100 text-indigo-700";
                  }

                  return (
                    <div key={i} className="flex items-center justify-between border border-gray-200 rounded-lg bg-white px-4 py-3.5 hover:shadow-sm transition-shadow shrink-0">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-gray-800 leading-tight">{event.title}</span>
                        <span className="text-[10px] font-bold text-gray-400">{eventDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded font-bold border ${badgeColor}`}>
                        {displayDate}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No upcoming events</div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE (CALENDAR PREVIEW - BRICK WALL TRIGGER) */}
        <div className="w-80 flex flex-col items-center justify-center pl-6 cursor-pointer group relative overflow-hidden shrink-0" onClick={() => setShowCalendar(true)}>
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none transform scale-150 group-hover:scale-125 transition-transform duration-700">
            <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" /></svg>
          </div>
          <div className="z-10 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><CalendarIconLarge /></div>
            <div>
              <h3 className="text-xl font-bold text-primary group-hover:text-black transition-colors">Academic Calendar</h3>
              <p className="text-sm text-gray-500 mt-1">Tap to view full schedule</p>
            </div>
            <button 
              type="button" 
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-transparent border-2 border-primary text-primary rounded-xl text-sm font-bold hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={(e) => { e.stopPropagation(); handleDownloadPdf(); }} 
              disabled={isDownloading}
            >
              <DownloadIcon /> {isDownloading ? "Generating PDF..." : "Download PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* THE BRICK WALL MODAL */}
      <Modal
        isOpen={showCalendar}
        onClose={() => { setShowCalendar(false); setActiveCell(null); }}
        className="h-[85vh] w-[92vw] max-w-[1100px]"
      >
        <div className="flex flex-col h-full bg-white/85 backdrop-blur-xl border border-white rounded-[24px] p-8 shadow-2xl relative overflow-hidden">
          {/* REFERENCE HEADER */}
          <div className="flex justify-between items-center mb-6 shrink-0 relative z-30 px-2">
            {/* LEFT SIDE: Date Header */}
            {viewMode === "grid" && (
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 text-white px-6 py-2 rounded-full shadow-lg border border-slate-800">
                  <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 relative">
                    <GlitchText text={currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} />
                  </h2>
                </div>
              </div>
            )}

            {/* SLIDING TOGGLE (Centered) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1.5 z-40">
              <div
                className={`absolute left-1.5 top-1.5 bottom-1.5 w-[140px] rounded-xl bg-slate-900 shadow-md transition-transform duration-300 ease-out ${viewMode === "calendar" ? "translate-x-[140px]" : "translate-x-0"
                  }`}
              />
              <button
                onClick={() => setViewMode("grid")}
                className={`relative z-10 w-[140px] px-4 py-2 rounded-xl text-sm font-bold text-center transition-colors duration-200 ${viewMode === "grid" ? "text-white" : "text-gray-600 hover:text-primary"
                  }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`relative z-10 w-[140px] px-4 py-2 rounded-xl text-sm font-bold text-center transition-colors duration-200 ${viewMode === "calendar" ? "text-white" : "text-gray-600 hover:text-primary"
                  }`}
              >
                Document View
              </button>
            </div>

            <div className="flex items-center gap-4 relative z-40">
              {viewMode === "grid" && (
                <div className="flex items-center bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm mr-2">
                  <button
                    onClick={() => {
                      const next = new Date(currentDate);
                      next.setMonth(next.getMonth() - 1);
                      setActiveCell(null);
                      setCurrentDate(next);
                    }}
                    className="px-4 py-1.5 hover:bg-gray-50 rounded-xl transition-all text-slate-400 font-bold active:scale-95"
                  >
                    &lt;
                  </button>
                  <div className="w-px h-4 bg-gray-100 mx-1"></div>
                  <button
                    onClick={() => {
                      const next = new Date(currentDate);
                      next.setMonth(next.getMonth() + 1);
                      setActiveCell(null);
                      setCurrentDate(next);
                    }}
                    className="px-4 py-1.5 hover:bg-gray-50 rounded-xl transition-all text-slate-400 font-bold active:scale-95"
                  >
                    &gt;
                  </button>
                </div>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-sm border ${showExportMenu ? "bg-slate-900 text-white border-slate-900" : "bg-white border-gray-100 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <DownloadIcon /> Export
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <button
                      onClick={() => handleDownloadRawPdf()}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-50"
                    >
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
                      </div>
                      Raw PDF (Images)
                    </button>
                    <button
                      onClick={() => handleDownloadPdf()}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-50"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z" /></svg>
                      </div>
                      Schedule PDF
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-500">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13z" /></svg>
                      </div>
                      Download Excel
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => { setShowCalendar(false); setActiveCell(null); }} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center transition-all">?</button>
            </div>
          </div>

          {viewMode === "grid" ? (
            <>
              {/* REFERENCE WEEKDAYS */}
              <div className="grid grid-cols-7 mb-4 shrink-0 px-4 relative z-10">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                  <div key={day} className="text-[11px] font-bold text-gray-300 tracking-widest">{day}</div>
                ))}
              </div>

              {/* REFERENCE LOCKED GRID */}
              <div className="flex-1 min-h-0 relative z-10">
                <div
                  className={`
                    grid gap-3 h-full w-full
                    ${!activeCell ? "grid-rows-6" : ""}
                  `}
                  style={{
                    transitionProperty: 'grid-template-columns, grid-template-rows',
                    transitionDuration: '400ms',
                    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    gridTemplateColumns: activeCell
                      ? Array.from({ length: 7 }, (_, i) => i === activeCell.col ? '3.5fr' : '1fr').join(' ')
                      : '1fr 1fr 1fr 1fr 1fr 1fr 1fr',
                    gridTemplateRows: activeCell
                      ? Array.from({ length: 6 }, (_, i) => i === activeCell.row ? '3.5fr' : '1fr').join(' ')
                      : '1fr 1fr 1fr 1fr 1fr 1fr'
                  }}
                >
                  {/* CELL RENDERING */}
                  {(() => {
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const firstDayIndex = new Date(year, month, 1).getDay();

                    return Array.from({ length: 42 }).map((_, i) => {
                      const dayNumber = i - firstDayIndex + 1;
                      const isActualDay = dayNumber > 0 && dayNumber <= daysInMonth;
                      const d = new Date(year, month, dayNumber);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dayDate = new Date(d);
                      dayDate.setHours(0, 0, 0, 0);
                      const isToday = isActualDay && dayDate.getTime() === today.getTime();
                      const isPastDay = isActualDay && dayDate.getTime() < today.getTime();

                      const cellDateKey = toDateKey(d);
                      const eventsOnDay = calendarEvents
                        .filter(e => toDateKey(e.date) === cellDateKey)
                        .map(e => ({ ...e, isTodo: false }));

                      const todosOnDay = activeGridTodos
                        .filter(todo => (todo.__dueDateKey || toDateKey(todo.dueDate)) === cellDateKey)
                        .map(t => ({ title: t.title, description: t.description, type: 'TO-DO', isTodo: true }));

                      const allItems = [...eventsOnDay, ...todosOnDay];

                      const row = Math.floor(i / 7);
                      const col = i % 7;
                      const isActive = activeCell?.row === row && activeCell?.col === col;

                      return (
                        <div
                          key={i}
                          onClick={() => isActualDay && setActiveCell(isActive ? null : { row, col })}
                          className={`
                            day-cell group relative border transition-all duration-[400ms] ease-[cubic-bezier(0.4, 0, 0.2, 1)] overflow-hidden rounded-[16px] p-4 flex flex-col items-stretch
                            ${isActualDay ? "cursor-pointer" : "opacity-0 pointer-events-none"}
                            ${isActive
                              ? "bg-slate-100 border-black/20 shadow-[0_12px_24px_rgba(0,0,0,0.1)] z-20"
                              : isToday
                                ? "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 hover:border-emerald-700 hover:shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
                                : isPastDay
                                  ? "bg-gray-100 border-gray-200 hover:bg-gray-100 text-gray-500"
                                  : "bg-white border-[#f3f4f6] hover:bg-[#f9fafb] hover:border-[#e5e7eb] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                            }
                          `}
                        >
                          {isActualDay && (
                            <>
                              <div className="flex justify-between items-start w-full">
                                <span className={`
                                  font-bold transition-all duration-[400ms] ease-[cubic-bezier(0.4, 0, 0.2, 1)] 
                                  ${isActive ? "text-[3rem] text-slate-900" : isToday ? "text-[1.4rem] text-white" : isPastDay ? "text-[1.4rem] text-gray-400" : "text-[1.4rem] text-[#1f2937]"}
                                `}>
                                  {dayNumber}
                                </span>

                                {allItems.length > 0 && (
                                  <div className={`
                                    w-2 h-2 rounded-full transition-all duration-[400ms] ease-[cubic-bezier(0.4, 0, 0.2, 1)] border border-white/20
                                    ${allItems[0].isTodo ? "bg-slate-900" : getDotColor(allItems[0].type)}
                                    ${isActive ? "scale-150 mt-4 mr-2" : "mt-2 mr-1"}
                                  `}></div>
                                )}
                              </div>

                              {/* EXPANDED CONTENT */}
                              {isActive && allItems.length > 0 && (
                                <div className="mt-2 flex-1 flex flex-col gap-1.5 animate-in fade-in transition-opacity duration-500 overflow-y-auto no-scrollbar pr-0.5">
                                  {allItems.map((ev, idx) => (
                                    <div
                                      key={idx}
                                      className={`
                                        p-2.5 pr-4 rounded-xl border-y border-r border-gray-100 shadow-sm break-words bg-white
                                        ${ev.isTodo ? "border-l-4 border-l-slate-900" : `border-l-4 ${getEventBorderColor(ev.type)}`}
                                      `}
                                    >
                                      <div className="text-sm font-medium text-slate-900 leading-tight break-words">{ev.title}</div>
                                      <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${ev.isTodo ? "text-slate-500" : "text-gray-400"}`}>
                                        {ev.type}
                                      </div>
                                      {ev.description && (
                                        <div className="mt-1.5 text-[11px] font-medium text-gray-500 leading-relaxed italic border-t border-gray-100 pt-1.5 break-words">
                                          {ev.description}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* TODAY INDICATOR */}
                              {isToday && !isActive && (
                                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          ) : (
            /* IMAGE VIEW (Scrollable & Zoomable Stack) */
            <div className="w-full bg-slate-50/50 rounded-2xl border border-slate-200/60 overflow-hidden shadow-inner p-2 md:p-4 flex-1 flex flex-col relative">
              <div
                className={`flex-1 overflow-auto bg-transparent flex flex-col items-center p-4 rounded-xl relative soft-scrollbar ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
              {cachedImages.isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <LoadingState size="md" />
                </div>
              ) : (cachedImages.odd && cachedImages.even) ? (
                <div
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                    transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    cursor: isDragging ? "grabbing" : "grab",
                    transformOrigin: "top center"
                  }}
                  className="select-none flex flex-col gap-12 pb-24"
                >
                  {/* Odd Sem Image */}
                  <div className="flex flex-col items-center relative w-full max-w-5xl">
                    <h3 className="absolute top-4 left-4 z-20 text-sm font-bold bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full shadow-sm border border-emerald-100">Odd Semester</h3>
                    <img
                      src={cachedImages.odd}
                      alt="Odd Semester Calendar"
                      className="w-full object-contain shadow-xl rounded-2xl border border-gray-200 pointer-events-none bg-white"
                      onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/800x1200?text=Odd+Semester+Image+Not+Found"; }}
                    />
                  </div>

                  <div className="w-full flex justify-center items-center gap-8 opacity-30">
                    <div className="flex-1 h-px bg-gray-400"></div>
                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    <div className="flex-1 h-px bg-gray-400"></div>
                  </div>

                  {/* Even Sem Image */}
                  <div className="flex flex-col items-center relative w-full max-w-5xl">
                    <h3 className="absolute top-4 left-4 z-20 text-sm font-bold bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full shadow-sm border border-indigo-100">Even Semester</h3>
                    <img
                      src={cachedImages.even}
                      alt="Even Semester Calendar"
                      className="w-full object-contain shadow-xl rounded-2xl border border-gray-200 pointer-events-none bg-white"
                      onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/800x1200?text=Even+Semester+Image+Not+Found"; }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">Failed to load calendar documents.</div>
              )}
              </div>
            </div>
          )}

          {/* FLOATING ZOOM CONTROLS (Bottom Center, Pinned to Modal Viewport) */}
          {viewMode === "calendar" && !cachedImages.isLoading && cachedImages.odd && cachedImages.even && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-white/90 backdrop-blur shadow-lg border border-slate-100 rounded-full px-4 py-2 text-slate-700 pointer-events-auto">
              <button onClick={zoomOut} className="p-1.5 hover:bg-slate-100 rounded-full transition-all text-slate-500 hover:text-slate-900 active:scale-95" title="Zoom Out"><ZoomOutIcon /></button>
              <span className="text-sm font-black w-12 text-center text-slate-800">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={zoomIn} className="p-1.5 hover:bg-slate-100 rounded-full transition-all text-slate-500 hover:text-slate-900 active:scale-95" title="Zoom In"><ZoomInIcon /></button>
              <div className="w-px h-5 bg-slate-200 mx-2"></div>
              <button onClick={resetZoom} className="p-1.5 hover:bg-slate-100 rounded-full transition-all text-slate-500 hover:text-slate-900 active:scale-95" title="Reset"><ResetIcon /></button>
            </div>
          )}

        </div>
      </Modal>
    </div>
  );
}

