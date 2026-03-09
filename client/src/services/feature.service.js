import { FEATURE_TAP_THRESHOLD } from "../utils/feature.constants";

const STORAGE_KEY = "feature-v1";

const defaultState = {
  tapCount: 0,
  unlocked: false,
};

const safeParse = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function getFeatureState() {
  const parsed = safeParse(sessionStorage.getItem(STORAGE_KEY));
  if (!parsed || typeof parsed !== "object") return defaultState;

  const tapCount =
    typeof parsed.tapCount === "number" && parsed.tapCount >= 0
      ? parsed.tapCount
      : 0;
  const unlocked = parsed.unlocked === true;

  return { tapCount, unlocked };
}

export function registerFeatureTap() {
  const prev = getFeatureState();
  const nextTapCount = Math.min(FEATURE_TAP_THRESHOLD, (prev.tapCount || 0) + 1);
  const unlocked = prev.unlocked || nextTapCount >= FEATURE_TAP_THRESHOLD;
  const next = { tapCount: nextTapCount, unlocked };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  return {
    ...next,
    newlyUnlocked: !prev.unlocked && unlocked,
  };
}

export function resetFeature() {
  sessionStorage.removeItem(STORAGE_KEY);
}

