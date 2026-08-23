export const AVATAR_COLORS = ["bg-pine", "bg-rust", "bg-brass", "bg-sage"];

/** Deterministic fallback avatar color for a name with no photo — same
 * name always gets the same color, so it stays recognizable across a list. */
export function avatarColorFor(name: string) {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}
