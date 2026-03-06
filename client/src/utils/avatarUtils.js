
// Helper to resolve profile images
export const getAvatarUrl = (id) => {
  if (!id) return null;
  return new URL(`../assets/profile/${id}.png`, import.meta.url).href;
};
