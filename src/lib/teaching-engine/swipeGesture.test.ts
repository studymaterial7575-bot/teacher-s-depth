import { describe, expect, it } from "vitest";
import { resolveSwipeDirection } from "@/lib/teaching-engine/swipeGesture";

describe("resolveSwipeDirection", () => {
  it("returns next for a leftward swipe past the threshold", () => {
    expect(resolveSwipeDirection(-80, 5)).toBe("next");
  });

  it("returns prev for a rightward swipe past the threshold", () => {
    expect(resolveSwipeDirection(80, -5)).toBe("prev");
  });

  it("returns null for short taps below the distance threshold", () => {
    expect(resolveSwipeDirection(10, 2)).toBeNull();
  });

  it("returns null for mostly vertical scrolling gestures", () => {
    expect(resolveSwipeDirection(50, 60)).toBeNull();
  });

  it("returns null for zero-distance touches", () => {
    expect(resolveSwipeDirection(0, 0)).toBeNull();
  });
});
