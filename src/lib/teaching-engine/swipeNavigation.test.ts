import { describe, expect, it } from "vitest";
import {
  DEFAULT_SWIPE_COOLDOWN_MS,
  getNextCardIndex,
  resolveSwipeDirection,
  shouldAllowSwipeNavigation,
} from "@/lib/teaching-engine/swipeNavigation";

describe("resolveSwipeDirection", () => {
  it("returns null for a short tap-like movement", () => {
    expect(resolveSwipeDirection({ deltaX: 5, deltaY: 2 })).toBeNull();
  });

  it("returns null when vertical scrolling dominates", () => {
    expect(resolveSwipeDirection({ deltaX: 45, deltaY: 120 })).toBeNull();
  });

  it("returns left for a leftward swipe past the threshold", () => {
    expect(resolveSwipeDirection({ deltaX: -80, deltaY: 5 })).toBe("left");
  });

  it("returns right for a rightward swipe past the threshold", () => {
    expect(resolveSwipeDirection({ deltaX: 80, deltaY: -5 })).toBe("right");
  });

  it("ignores diagonal drags that are not clearly horizontal", () => {
    expect(resolveSwipeDirection({ deltaX: 50, deltaY: 40 })).toBeNull();
  });
});

describe("shouldAllowSwipeNavigation", () => {
  it("blocks a navigation attempt inside the cooldown window", () => {
    expect(shouldAllowSwipeNavigation(1000, 900)).toBe(false);
  });

  it("allows a navigation attempt once the cooldown has elapsed", () => {
    expect(shouldAllowSwipeNavigation(1000 + DEFAULT_SWIPE_COOLDOWN_MS, 1000)).toBe(true);
  });

  it("supports a custom cooldown duration", () => {
    expect(shouldAllowSwipeNavigation(1100, 1000, 50)).toBe(true);
    expect(shouldAllowSwipeNavigation(1030, 1000, 50)).toBe(false);
  });
});

describe("getNextCardIndex", () => {
  it("advances to the next card on a left swipe", () => {
    expect(getNextCardIndex("left", 1, 5)).toBe(2);
  });

  it("clamps at the last card on a left swipe", () => {
    expect(getNextCardIndex("left", 4, 5)).toBe(4);
  });

  it("goes back to the previous card on a right swipe", () => {
    expect(getNextCardIndex("right", 2, 5)).toBe(1);
  });

  it("clamps at the first card on a right swipe", () => {
    expect(getNextCardIndex("right", 0, 5)).toBe(0);
  });

  it("returns the current index when there is no resolved direction", () => {
    expect(getNextCardIndex(null, 3, 5)).toBe(3);
  });

  it("returns the current index when there are no cards", () => {
    expect(getNextCardIndex("left", 0, 0)).toBe(0);
  });
});
