import { useLocation } from "react-router-dom";
import { BREADCRUMB_CONFIG } from "../../config/breadcrumbs";

export default function Breadcrumb({ extra = [] }) {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length < 2) return null;

  // role was here but unused now

  let section;
  let pageKey;

  if (parts[1] === "community") {
    section = "community";
    pageKey = parts[2];
  } else {
    section = "home";
    pageKey = parts[1];
  }

  const config = BREADCRUMB_CONFIG[section];
  if (!config) return null;

  const pageLabel = config.children?.[pageKey] || config.default;

  // Construct the full breadcrumb text string
  let breadcrumbText = `${config.label} / ${pageLabel}`;
  if (extra.length > 0) {
    breadcrumbText += ` / ${extra.join(" / ")}`;
  }

  return (
    <div className="flex items-center text-xs select-none font-bold uppercase tracking-widest pl-1">
      <span className="text-slate-400">{config.label}</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-800">{pageLabel}</span>
      {extra.length > 0 && (
        <>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-800 truncate">{extra.join(" / ")}</span>
        </>
      )}
    </div>
  );
}
