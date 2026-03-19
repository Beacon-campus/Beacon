export function preloadAsset(href, options = {}) {
  if (typeof document === "undefined" || !href) return;

  const {
    as = "fetch",
    type = "",
    crossOrigin = "anonymous",
    rel = "preload",
  } = options;

  const existing = document.head.querySelector(`link[rel="${rel}"][href="${href}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  link.as = as;
  if (type) link.type = type;
  if (crossOrigin) link.crossOrigin = crossOrigin;
  document.head.appendChild(link);
}
