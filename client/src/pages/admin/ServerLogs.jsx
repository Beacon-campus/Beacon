import { useEffect, useMemo, useState } from "react";
import { auth } from "../../firebase/firebase";
import apiClient from "../../services/apiClient";
import { getOrFetchPageCache } from "../../services/pageCache.service";

const PAGE_SIZE = 20;

function toneForStatus(status) {
  if (status === "success") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "failure") return "text-red-700 bg-red-50 border-red-200";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

function prettyDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function ServerLogs() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async (force = false) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search.trim()) params.set("search", search.trim());
      if (category) params.set("category", category);
      if (status) params.set("status", status);

      const userKey = auth.currentUser?.uid || "guest";
      const cacheKey = `admin:logs:${params.toString()}`;
      const data = await getOrFetchPageCache(
        cacheKey,
        userKey,
        async () => {
          const response = await apiClient.get(`/admin/logs?${params.toString()}`);
          return response.data;
        },
        { force, ttlMs: 15_000 }
      );
      setRows(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, status]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        fetchLogs(true);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => fetchLogs(true), 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, page, category, status, search]);

  const categoryOptions = useMemo(() => {
    const base = ["auth", "media", "university", "system"];
    const dynamic = Array.from(new Set(rows.map((r) => r.category).filter(Boolean)));
    return Array.from(new Set([...base, ...dynamic]));
  }, [rows]);

  return (
    <div className="h-full w-full rounded-2xl border border-gray-100 bg-white shadow-sm p-6 flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Server Activity Logs</h2>
          <p className="text-sm text-slate-500 mt-1">Tracks login/logout, uploads, and key backend actions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-bold border ${autoRefresh ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}
          >
            {autoRefresh ? "Auto Refresh ON" : "Auto Refresh OFF"}
          </button>
          <button
            onClick={() => fetchLogs(true)}
            className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search actor, event, file..."
          className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
        />
        <select
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="success">success</option>
          <option value="failure">failure</option>
          <option value="info">info</option>
        </select>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Total logs: {total}</span>
        <button
          onClick={() => {
            setPage(1);
            setSearch("");
            setCategory("");
            setStatus("");
          }}
          className="underline underline-offset-2 hover:text-slate-700"
        >
          Clear filters
        </button>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-gray-100">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">Loading logs...</div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">No logs found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((row) => (
              <div key={row._id} className="p-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{row.eventType}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${toneForStatus(row.status)}`}>{row.status}</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{row.category}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{row.message || row.action}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {row.actor?.name || "Unknown user"} {row.actor?.role ? `(${row.actor.role})` : ""} {row.actor?.email ? `- ${row.actor.email}` : ""}
                    </p>
                    {row.metadata && Object.keys(row.metadata).length > 0 && (
                      <div className="mt-2 text-[11px] text-slate-500 bg-slate-100 rounded-lg px-2 py-1 overflow-auto">
                        {JSON.stringify(row.metadata)}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{prettyDate(row.createdAt)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{row.ip || "-"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          className="px-3 py-2 rounded-lg text-xs font-bold border border-gray-200 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          className="px-3 py-2 rounded-lg text-xs font-bold border border-gray-200 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
