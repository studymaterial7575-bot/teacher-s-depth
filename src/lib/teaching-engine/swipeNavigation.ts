// Pure helpers for the Teaching Deck's mobile swipe navigation.
// Kept framework-free so gesture math can be unit tested without a DOM/touch simulation.

export type SwipeDirection = "left" | "right" | null;

export type SwipeVector = {
  deltaX: number;
  deltaY: number;
};

/** Minimum horizontal travel (px) before a gesture counts as an intentional swipe. */
export const MIN_SWIPE_DISTANCE_PX = 40;

/** Horizontal movement must exceed vertical movement by this ratio to avoid hijacking scroll. */
export const HORIZONTAL_DOMINANCE_RATIO = 1.5;

/** Minimum time (ms) required between two accepted swipe navigations. */
export const DEFAULT_SWIPE_COOLDOWN_MS = 350;

/**
 * Determines the swipe direction (if any) from a touch delta.
 * Returns null when the gesture is too short, or when vertical movement
 * (i.e. page scrolling) dominates over horizontal movement.
 */
export function resolveSwipeDirection({ deltaX, deltaY }: SwipeVector): SwipeDirection {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < MIN_SWIPE_DISTANCE_PX) return null;
  if (absX < absY * HORIZONTAL_DOMINANCE_RATIO) return null;

  return deltaX < 0 ? "left" : "right";
}

/**
 * Guards against rapid/duplicate swipe navigations firing in quick succession
 * (e.g. multiple touchend events, fast flicks, or accidental double gestures).
 */
export function shouldAllowSwipeNavigation(
  nowMs: number,
  lastNavigationMs: number,
  cooldownMs: number = DEFAULT_SWIPE_COOLDOWN_MS,
): boolean {
  return nowMs - lastNavigationMs >= cooldownMs;
}

/**
 * Computes the next card index for a resolved swipe direction, clamped to the
 * valid card range. "left" advances (next card), "right" goes back (previous card).
 */
export function getNextCardIndex(
  direction: SwipeDirection,
  currentIndex: number,
  totalCards: number,
): number {
  if (!direction || totalCards <= 0) return currentIndex;
  if (direction === "left") return Math.min(totalCards - 1, currentIndex + 1);
  return Math.max(0, currentIndex - 1);
}
