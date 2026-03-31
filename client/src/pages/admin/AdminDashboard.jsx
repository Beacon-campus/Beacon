import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";
import { fetchAdminDashboardOverview, fetchAdminDashboardTimeline } from "../../services/university.service";
import LoadingState from "../../components/ui/LoadingState";

const COLORS = {
  healthy: "#16a34a",
  healthySoft: "#86efac",
  healthyAlt: "#0d9488",
  warning: "#f59e0b",
  warningSoft: "#fcd34d",
  critical: "#dc2626",
  criticalSoft: "#fca5a5",
  neutral: "#64748b",
  neutralSoft: "#cbd5e1",
  panel: "#ffffff",
  panelBorder: "#e2e8f0",
};

const TABS = [
  { id: "main", label: "Main" },
  { id: "firebase", label: "Firebase" },
  { id: "mongodb", label: "MongoDB" },
  { id: "cloudinary", label: "Cloudinary" },
  { id: "server", label: "Server" },
];

const LABELS = {
  requestCount: "Requests",
  p95: "Server Response Time",
  errorRate: "Critical Errors",
  heapUsedMB: "Memory Usage",
  mongoUsers: "App Users",
  mongoMessages: "Messages",
  mongoAssignments: "Assignments",
  firestoreUsers: "Firebase Profiles",
  firebaseSyncGap: "Sync Difference",
  cloudStoragePct: "Storage Used",
  cloudBandwidthPct: "Bandwidth Used",
};

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(2)} MB`;
}

function formatMetric(key, value) {
  const num = Number(value || 0);
  if (["p95"].includes(key)) return `${num.toFixed(1)} ms`;
  if (["errorRate", "cloudStoragePct", "cloudBandwidthPct"].includes(key)) return `${num.toFixed(1)}%`;
  if (["heapUsedMB"].includes(key)) return `${num.toFixed(1)} MB`;
  return num.toLocaleString();
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-md px-3 py-2 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <p key={`${entry.dataKey}-${entry.name}`} className="font-semibold" style={{ color: entry.color || COLORS.neutral }}>
            {(LABELS[entry.dataKey] || entry.name) + ": " + formatMetric(entry.dataKey, entry.value)}
          </p>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, helper, tone = "neutral" }) {
  const tones = {
    healthy: "border-green-200 bg-green-50 text-green-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    critical: "border-red-200 bg-red-50 text-red-800",
    neutral: "border-slate-200 bg-slate-50 text-slate-800",
  };
  return (
    <div className={`rounded-xl border p-3 min-[426px]:p-4 ${tones[tone] || tones.neutral}`}>
      <p className="text-xs min-[426px]:text-[11px] min-[1025px]:text-xs uppercase tracking-wide font-bold opacity-75">{label}</p>
      <p className="text-[1.35rem] min-[426px]:text-[1.35rem] min-[1025px]:text-2xl font-black mt-1 break-words">{value}</p>
      {helper ? <p className="text-xs min-[426px]:text-[11px] min-[1025px]:text-xs mt-2 opacity-85">{helper}</p> : null}
    </div>
  );
}

function ChartPanel({ title, subtitle, children }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-3 min-[426px]:p-4">
      <h3 className="text-sm font-black text-slate-800">{title}</h3>
      <p className="text-xs min-[426px]:text-[11px] min-[1025px]:text-xs text-slate-500 mt-1 mb-3">{subtitle}</p>
      {children}
    </div>
  );
}

function LimitProgress({ label, value, tone }) {
  const clamped = Math.max(0, Math.min(100, Number(value || 0)));
  const barColor = tone === "critical" ? COLORS.critical : tone === "warning" ? COLORS.warning : COLORS.healthyAlt;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
        <span>{label}</span>
        <span>{clamped.toFixed(1)}%</span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${clamped}%`, backgroundColor: barColor }} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("main");
  const [overview, setOverview] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async (silent = false, force = false) => {
    try {
      if (!silent) setLoading(true);
      const [overviewData, points] = await Promise.all([
        fetchAdminDashboardOverview({ force }),
        fetchAdminDashboardTimeline(120),
      ]);
      setOverview(overviewData);
      setTimeline(points || []);
    } catch (error) {
      console.error(error);
      if (!silent) toast.error("Failed to load dashboard metrics");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    refresh(false);
    const timer = setInterval(() => refresh(true, true), 30000);
    return () => clearInterval(timer);
  }, []);

  const rows = useMemo(
    () =>
      (timeline || []).map((point) => ({
        time: new Date(point.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
        requestCount: point.requestCount || 0,
        p95: point.p95 || 0,
        errorRate: point.errorRate || 0,
        heapUsedMB: point.heapUsedMB || 0,
        mongoUsers: point.mongoUsers || 0,
        mongoMessages: point.mongoMessages || 0,
        mongoAssignments: point.mongoAssignments || 0,
        firestoreUsers: point.firestoreUsers || 0,
        firebaseSyncGap: point.firebaseSyncGap || 0,
        cloudStoragePct: point.cloudStoragePct || 0,
        cloudBandwidthPct: point.cloudBandwidthPct || 0,
      })),
    [timeline]
  );

  const fallbackRow = useMemo(() => {
    const usage = overview?.cloudinary?.usage;
    const storagePct = usage?.storage_limit ? Number((((usage.storage || 0) / usage.storage_limit) * 100).toFixed(2)) : 0;
    const bandwidthPct = usage?.bandwidth_limit ? Number((((usage.bandwidth || 0) / usage.bandwidth_limit) * 100).toFixed(2)) : 0;
    return {
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
      requestCount: overview?.requests?.last5m?.count || 0,
      p95: overview?.requests?.last5m?.p95 || 0,
      errorRate: overview?.requests?.last60m?.errorRate || 0,
      heapUsedMB: overview?.runtime?.memory?.heapUsedMB || 0,
      mongoUsers: overview?.mongodb?.counts?.users || 0,
      mongoMessages: overview?.mongodb?.counts?.messages || 0,
      mongoAssignments: overview?.mongodb?.counts?.assignments || 0,
      firestoreUsers: overview?.firebase?.firestoreUsers || 0,
      firebaseSyncGap: overview?.firebase?.syncGap || 0,
      cloudStoragePct: storagePct,
      cloudBandwidthPct: bandwidthPct,
    };
  }, [overview]);

  const chartRows = rows.length > 0 ? rows : [fallbackRow];
  const isUsingFallback = rows.length === 0;

  const cloudUsage = overview?.cloudinary?.usage || null;
  const storagePct = chartRows[chartRows.length - 1]?.cloudStoragePct || 0;
  const bandwidthPct = chartRows[chartRows.length - 1]?.cloudBandwidthPct || 0;
  const errorPct = overview?.requests?.last60m?.errorRate || 0;

  const statusBars = useMemo(() => {
    const byStatus = overview?.requests?.byStatus || { "2xx": 0, "4xx": 0, "5xx": 0 };
    return [
      { name: "Healthy", value: byStatus["2xx"] || 0, fill: COLORS.healthy },
      { name: "Warning", value: byStatus["4xx"] || 0, fill: COLORS.warning },
      { name: "Critical", value: byStatus["5xx"] || 0, fill: COLORS.critical },
    ];
  }, [overview]);

  const folderBars = useMemo(() => {
    const folders = overview?.cloudinary?.folderBreakdown || {};
    const base = [
      { key: "chat/", name: "Chat" },
      { key: "groups/", name: "Groups" },
      { key: "community/official/", name: "Official" },
      { key: "community/hub/", name: "Hub" },
      { key: "study-materials/", name: "Study Material" },
      { key: "assignments/submissions/", name: "Submissions" },
      { key: "assignments/resources/", name: "Assignment Files" },
      { key: "university/announcements/", name: "Announcements" },
    ];
    return base.map((item) => ({ name: item.name, value: Number(folders[item.key] || 0) }));
  }, [overview]);

  const halfGaugeData = [
    { name: "Storage", value: storagePct, fill: storagePct > 85 ? COLORS.critical : storagePct > 70 ? COLORS.warning : COLORS.healthyAlt },
    { name: "Bandwidth", value: bandwidthPct, fill: bandwidthPct > 85 ? COLORS.critical : bandwidthPct > 70 ? COLORS.warning : COLORS.healthy },
  ];

  if (loading) {
    return (
      <div className="h-full w-full p-6 bg-white">
        <div className="h-full w-full flex items-center justify-center">
          <LoadingState size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto no-scrollbar p-3 min-[426px]:p-4 min-[769px]:p-5 min-[1025px]:p-6 bg-slate-50 rounded-2xl min-[1025px]:rounded-3xl shadow-sm border border-slate-100">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col min-[769px]:flex-row min-[769px]:items-center min-[769px]:justify-between gap-3">
          <div>
            <h1 className="text-[1.45rem] min-[426px]:text-[1.45rem] min-[1025px]:text-2xl font-black text-slate-800">System Health Dashboard</h1>
            <p className="text-sm min-[426px]:text-[13px] min-[1025px]:text-sm text-slate-500 mt-1">Quickly understand performance, reliability, and capacity across all core services.</p>
          </div>
          <button onClick={() => refresh(false, true)} className="w-full min-[426px]:w-auto px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-bold hover:bg-[#1e293b] transition-all shadow-md active:scale-95">
            Refresh
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar min-[769px]:flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-3 min-[426px]:px-4 py-2 rounded-lg text-sm min-[426px]:text-[13px] min-[1025px]:text-sm font-bold border transition-colors ${activeTab === tab.id ? "bg-[#0F172A] text-white border-[#0F172A] shadow-md shadow-[#0F172A]/20" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isUsingFallback && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Live trend points are still warming up. Until enough samples are collected, charts show a current snapshot.
          </div>
        )}

        {activeTab === "main" && (
          <>
            <div className="grid grid-cols-1 min-[426px]:grid-cols-2 min-[1025px]:grid-cols-4 gap-4">
              <StatCard
                label="Database Health"
                value={overview?.mongodb?.state === "connected" ? "Connected" : "Needs Attention"}
                helper={overview?.mongodb?.state === "connected" ? "MongoDB connection is stable." : "Database connection is not fully healthy."}
                tone={overview?.mongodb?.state === "connected" ? "healthy" : "critical"}
              />
              <StatCard
                label="Server Response Time"
                value={`${Number(overview?.requests?.last5m?.p95 || 0).toFixed(1)} ms`}
                helper="How quickly API requests are returning."
                tone={(overview?.requests?.last5m?.p95 || 0) > 1200 ? "warning" : "healthy"}
              />
              <StatCard
                label="Live Connections"
                value={Number(overview?.sockets?.totalSockets || 0).toLocaleString()}
                helper={`${Number(overview?.sockets?.roomCount || 0).toLocaleString()} active rooms`}
                tone="neutral"
              />
              <StatCard
                label="Critical Errors"
                value={`${Number(errorPct).toFixed(1)}%`}
                helper="Share of server errors in the last hour."
                tone={errorPct > 2 ? "critical" : errorPct > 0 ? "warning" : "healthy"}
              />
            </div>

            <div className="grid grid-cols-1 min-[769px]:grid-cols-2 gap-4">
              <ChartPanel
                title="Speed and Traffic Over Time"
                subtitle="Shows how fast the server is responding and how many requests are being handled. Spikes suggest slowdowns or load bursts."
              >
                <div className="h-56 min-[426px]:h-64 min-[1025px]:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartRows}>
                      <defs>
                        <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.healthySoft} stopOpacity={0.75} />
                          <stop offset="100%" stopColor={COLORS.healthySoft} stopOpacity={0.2} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.neutralSoft} />
                      <XAxis dataKey="time" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar yAxisId="left" dataKey="requestCount" fill="url(#trafficGrad)" name="Requests" radius={[5, 5, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="p95" stroke={COLORS.warning} strokeWidth={3} dot={false} name="Server Response Time" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>

              <ChartPanel
                title="Request Quality Mix"
                subtitle="Compares healthy, warning, and critical responses. More red indicates user-facing failures."
              >
                <div className="h-56 min-[426px]:h-64 min-[1025px]:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusBars}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.neutralSoft} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>
            </div>
          </>
        )}

        {activeTab === "firebase" && (
          <>
            <div className="grid grid-cols-1 min-[426px]:grid-cols-2 min-[1025px]:grid-cols-3 gap-4">
              <StatCard label="Firebase Profiles" value={Number(overview?.firebase?.firestoreUsers || 0).toLocaleString()} helper="User documents stored in Firebase." tone="healthy" />
              <StatCard label="App User Records" value={Number(overview?.firebase?.mongoUsers || 0).toLocaleString()} helper="User records stored in MongoDB." tone="neutral" />
              <StatCard
                label="Sync Difference"
                value={Number(overview?.firebase?.syncGap || 0).toLocaleString()}
                helper="Difference between Mongo users and Firebase profiles."
                tone={Math.abs(overview?.firebase?.syncGap || 0) > 0 ? "warning" : "healthy"}
              />
            </div>
            <div className="grid grid-cols-1 min-[769px]:grid-cols-2 gap-4">
              <ChartPanel
                title="User Counts by Source"
                subtitle="Tracks whether Firebase and app user records stay aligned over time."
              >
                <div className="h-56 min-[426px]:h-64 min-[1025px]:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartRows}>
                      <defs>
                        <linearGradient id="mongoUserGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.healthyAlt} stopOpacity={0.65} />
                          <stop offset="100%" stopColor={COLORS.healthyAlt} stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="fsUserGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.neutral} stopOpacity={0.55} />
                          <stop offset="100%" stopColor={COLORS.neutral} stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.neutralSoft} />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="mongoUsers" stroke={COLORS.healthyAlt} fill="url(#mongoUserGrad)" strokeWidth={2.5} name="App Users" />
                      <Area type="monotone" dataKey="firestoreUsers" stroke={COLORS.neutral} fill="url(#fsUserGrad)" strokeWidth={2.5} name="Firebase Profiles" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>
              <ChartPanel
                title="Sync Difference Trend"
                subtitle="Shows mismatch over time. A flat line near zero means both systems are in sync."
              >
                <div className="h-56 min-[426px]:h-64 min-[1025px]:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.neutralSoft} />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="firebaseSyncGap" stroke={COLORS.warning} strokeWidth={3} dot={false} name="Sync Difference" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>
            </div>
          </>
        )}

        {activeTab === "mongodb" && (
          <>
            <div className="grid grid-cols-1 min-[426px]:grid-cols-2 min-[1025px]:grid-cols-5 gap-4">
              <StatCard label="Users" value={Number(overview?.mongodb?.counts?.users || 0).toLocaleString()} helper="Registered user records." tone="healthy" />
              <StatCard label="Messages" value={Number(overview?.mongodb?.counts?.messages || 0).toLocaleString()} helper="Chat and channel messages." tone="neutral" />
              <StatCard label="Assignments" value={Number(overview?.mongodb?.counts?.assignments || 0).toLocaleString()} helper="Total assignment documents." tone="warning" />
              <StatCard label="Classrooms" value={Number(overview?.mongodb?.counts?.classrooms || 0).toLocaleString()} helper="Classroom groups tracked in DB." tone="healthy" />
              <StatCard label="University Posts" value={Number(overview?.mongodb?.counts?.universityAnnouncements || 0).toLocaleString()} helper="Global announcements stored." tone="neutral" />
            </div>
            <ChartPanel
              title="Data Growth Snapshot"
              subtitle="Shows how quickly your core MongoDB collections are growing. Sudden jumps can indicate usage spikes."
            >
              <div className="h-64 min-[426px]:h-72 min-[1025px]:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartRows}>
                    <defs>
                      <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.healthy} stopOpacity={0.65} />
                        <stop offset="100%" stopColor={COLORS.healthy} stopOpacity={0.08} />
                      </linearGradient>
                      <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.healthyAlt} stopOpacity={0.6} />
                        <stop offset="100%" stopColor={COLORS.healthyAlt} stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.neutralSoft} />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="mongoUsers" stroke={COLORS.healthy} fill="url(#usersGrad)" strokeWidth={2.5} name="Users" />
                    <Area type="monotone" dataKey="mongoMessages" stroke={COLORS.healthyAlt} fill="url(#msgGrad)" strokeWidth={2.5} name="Messages" />
                    <Line type="monotone" dataKey="mongoAssignments" stroke={COLORS.warning} strokeWidth={2.5} dot={false} name="Assignments" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          </>
        )}

        {activeTab === "cloudinary" && (
          <>
            <div className="grid grid-cols-1 min-[426px]:grid-cols-2 min-[1025px]:grid-cols-4 gap-4">
              <StatCard label="Storage Used" value={formatBytes(cloudUsage?.storage || 0)} helper={`Limit: ${formatBytes(cloudUsage?.storage_limit || 0)}`} tone={storagePct > 85 ? "critical" : storagePct > 70 ? "warning" : "healthy"} />
              <StatCard label="Bandwidth Used" value={formatBytes(cloudUsage?.bandwidth || 0)} helper={`Limit: ${formatBytes(cloudUsage?.bandwidth_limit || 0)}`} tone={bandwidthPct > 85 ? "critical" : bandwidthPct > 70 ? "warning" : "healthy"} />
              <StatCard label="Stored Files" value={Number(cloudUsage?.objects || 0).toLocaleString()} helper="Total uploaded objects." tone="neutral" />
              <StatCard label="Credits Used" value={Number(cloudUsage?.credits || 0).toLocaleString()} helper={`Limit: ${Number(cloudUsage?.credits_limit || 0).toLocaleString()}`} tone="warning" />
            </div>

            <div className="grid grid-cols-1 min-[769px]:grid-cols-2 gap-4">
              <ChartPanel
                title="Usage Against Limits"
                subtitle="Simple progress view of current storage and bandwidth consumption."
              >
                <div className="space-y-4 py-2">
                  <LimitProgress label="Storage Consumption" value={storagePct} tone={storagePct > 85 ? "critical" : storagePct > 70 ? "warning" : "healthy"} />
                  <LimitProgress label="Bandwidth Consumption" value={bandwidthPct} tone={bandwidthPct > 85 ? "critical" : bandwidthPct > 70 ? "warning" : "healthy"} />
                  <LimitProgress label="Critical Error Pressure" value={errorPct} tone={errorPct > 2 ? "critical" : errorPct > 0 ? "warning" : "healthy"} />
                </div>
              </ChartPanel>

              <ChartPanel
                title="Live Capacity Gauge"
                subtitle="Half-circle gauge for quick at-a-glance capacity checks."
              >
                <div className="h-56 min-[426px]:h-64 min-[1025px]:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="35%" outerRadius="95%" data={halfGaugeData} startAngle={180} endAngle={0} barSize={22}>
                      <RadialBar background dataKey="value" />
                      <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                      <Tooltip content={<CustomTooltip />} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>
            </div>

            <ChartPanel
              title="Where Files Are Coming From"
              subtitle="Breaks down uploads by feature area so you can spot storage hotspots quickly."
            >
              <div className="h-64 min-[426px]:h-72 min-[1025px]:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={folderBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.neutralSoft} />
                    <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill={COLORS.healthyAlt} radius={[8, 8, 0, 0]} name="Files" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          </>
        )}

        {activeTab === "server" && (
          <>
            <div className="grid grid-cols-1 min-[426px]:grid-cols-2 min-[1025px]:grid-cols-5 gap-4">
              <StatCard label="Server Uptime" value={Number(overview?.uptimeSec || 0).toLocaleString()} helper="Seconds since server start." tone="healthy" />
              <StatCard
                label="Memory Usage"
                value={`${Number(overview?.runtime?.memory?.heapUsedMB || 0).toFixed(1)} MB`}
                helper={`RSS: ${Number(overview?.runtime?.memory?.rssMB || 0).toFixed(1)} MB`}
                tone={(overview?.runtime?.memory?.heapUsedMB || 0) > 1024 ? "warning" : "healthy"}
              />
              <StatCard label="Active Connections" value={Number(overview?.sockets?.totalSockets || 0).toLocaleString()} helper={`${Number(overview?.sockets?.userRoomCount || 0).toLocaleString()} user rooms`} tone="neutral" />
              <StatCard label="Server Response Time" value={`${Number(overview?.requests?.last5m?.p95 || 0).toFixed(1)} ms`} helper="Last 5-minute response speed." tone={(overview?.requests?.last5m?.p95 || 0) > 1200 ? "warning" : "healthy"} />
              <StatCard label="Critical Errors" value={`${Number(errorPct).toFixed(1)}%`} helper="Error share in last 60 minutes." tone={errorPct > 2 ? "critical" : errorPct > 0 ? "warning" : "healthy"} />
            </div>

            <div className="grid grid-cols-1 min-[769px]:grid-cols-2 gap-4">
              <ChartPanel
                title="Server Health Timeline"
                subtitle="Tracks server response speed and critical errors together. Red spikes indicate instability."
              >
                <div className="h-56 min-[426px]:h-64 min-[1025px]:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartRows}>
                      <defs>
                        <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.criticalSoft} stopOpacity={0.6} />
                          <stop offset="100%" stopColor={COLORS.criticalSoft} stopOpacity={0.15} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.neutralSoft} />
                      <XAxis dataKey="time" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip content={<CustomTooltip />} />
                      <Area yAxisId="left" type="monotone" dataKey="errorRate" stroke={COLORS.critical} fill="url(#errorGrad)" strokeWidth={2} name="Critical Errors" />
                      <Line yAxisId="right" type="monotone" dataKey="p95" stroke={COLORS.warning} strokeWidth={3} dot={false} name="Server Response Time" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>

              <ChartPanel
                title="Memory Trend"
                subtitle="Shows server memory usage over time. Sustained upward movement can signal memory pressure."
              >
                <div className="h-56 min-[426px]:h-64 min-[1025px]:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartRows}>
                      <defs>
                        <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.warningSoft} stopOpacity={0.65} />
                          <stop offset="100%" stopColor={COLORS.warningSoft} stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.neutralSoft} />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="heapUsedMB" stroke={COLORS.warning} fill="url(#memGrad)" strokeWidth={2.5} name="Memory Usage" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
