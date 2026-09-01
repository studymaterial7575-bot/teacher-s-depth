export type SwipeDirection = "prev" | "next" | null;

/**
 * Minimum horizontal travel (px) before a touch gesture counts as a swipe.
 */
export const SWIPE_DISTANCE_THRESHOLD = 40;

/**
 * Horizontal travel must exceed vertical travel by this ratio so vertical
 * scrolling isn't misread as a card swipe.
 */
export const SWIPE_DIRECTION_RATIO = 1.5;

/**
 * Resolves a completed touch gesture into a teaching-deck navigation
 * direction. Returns null when the gesture is too short, too vertical, or
 * otherwise ambiguous (e.g. a tap or a scroll).
 */
export function resolveSwipeDirection(deltaX: number, deltaY: number): SwipeDirection {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < SWIPE_DISTANCE_THRESHOLD) return null;
  if (absX < absY * SWIPE_DIRECTION_RATIO) return null;

  return deltaX < 0 ? "next" : "prev";
}
