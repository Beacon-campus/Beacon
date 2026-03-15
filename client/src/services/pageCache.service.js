const CACHE_STORAGE_KEY = "beacon.page-cache.v1";

function safeParse(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readCache() {
  return safeParse(sessionStorage.getItem(CACHE_STORAGE_KEY));
}

function writeCache(cache) {
  sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
}

function buildKey(userId, pageKey) {
  return `${String(userId || "guest")}::${String(pageKey)}`;
}

export function getPageCache(pageKey, userId) {
  const cache = readCache();
  const key = buildKey(userId, pageKey);
  const entry = cache[key];
  if (!entry) return null;

  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    delete cache[key];
    writeCache(cache);
    return null;
  }

  return entry.data;
}

export function setPageCache(pageKey, userId, data, ttlMs = 0) {
  const cache = readCache();
  const key = buildKey(userId, pageKey);
  const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : null;

  cache[key] = {
    data,
    expiresAt,
    updatedAt: Date.now(),
  };

  writeCache(cache);
  return data;
}

export async function getOrFetchPageCache(pageKey, userId, fetcher, options = {}) {
  const { ttlMs = 0, force = false } = options;
  if (!force) {
    const cached = getPageCache(pageKey, userId);
    if (cached !== null) return cached;
  }
  const freshData = await fetcher();
  return setPageCache(pageKey, userId, freshData, ttlMs);
}

export function clearPageCache(pageKey, userId) {
  const cache = readCache();
  delete cache[buildKey(userId, pageKey)];
  writeCache(cache);
}

export function clearPageCacheByPrefix(prefix, userId) {
  const cache = readCache();
  const fullPrefix = `${String(userId || "guest")}::${String(prefix)}`;
  Object.keys(cache).forEach((key) => {
    if (key.startsWith(fullPrefix)) {
      delete cache[key];
    }
  });
  writeCache(cache);
}

export function clearAllPageCache() {
  sessionStorage.removeItem(CACHE_STORAGE_KEY);
}
