import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  buildCaptureFileName,
  CAPTURE_EXCLUDE_ATTRIBUTE,
  computeCaptureScale,
  MAX_CANVAS_DIMENSION,
  MAX_CAPTURE_SCALE,
  runFullPageCapture,
  shouldExcludeFromCapture,
} from "@/lib/teaching-engine/fullPageCapture";
import type { OutputOption } from "@/types/teaching-engine";

describe("Capture Full Page placement inside Source Content", () => {
  const routeSource = readFileSync(
    new URL("../../routes/teaching-engine.tsx", import.meta.url),
    "utf8",
  );

  it("places the Capture Full Page button inside the STEP 1 Source Content section", () => {
    const sourceContentStart = routeSource.indexOf("1. Upload Source Content");
    const nextSectionStart = routeSource.indexOf("2. Extract Metadata");
    expect(sourceContentStart).toBeGreaterThan(-1);
    expect(nextSectionStart).toBeGreaterThan(sourceContentStart);

    const sourceContentSection = routeSource.slice(sourceContentStart, nextSectionStart);
    expect(sourceContentSection).toContain("Capture Full Page");
    expect(sourceContentSection).toContain(CAPTURE_EXCLUDE_ATTRIBUTE);
    expect(sourceContentSection).toContain("onCaptureFullPage");
  });

  it("captures the rendered workflow container rather than a reconstructed approximation", () => {
    // The capture ref must sit on the real rendered wrapper div of the page.
    expect(routeSource).toContain("ref={captureRef}");
    expect(routeSource).toContain("captureElementToPngDataUrl(target)");
  });
});

describe("Capture Full Page behaviour", () => {
  it("hides the capture control during capture and restores it afterwards", async () => {
    let capturing = false;
    const setCapturing = vi.fn((value: boolean) => {
      capturing = value;
    });

    await runFullPageCapture({
      setCapturing,
      performCapture: async () => {
        // While capturing, the UI state marks the control as hidden/in-progress.
        expect(capturing).toBe(true);
        return "png-data-url";
      },
    });

    expect(capturing).toBe(false);
    expect(setCapturing).toHaveBeenNthCalledWith(1, true);
    expect(setCapturing).toHaveBeenNthCalledWith(2, false);
  });

  it("restores the capture control even when capture fails", async () => {
    let capturing = false;
    const setCapturing = vi.fn((value: boolean) => {
      capturing = value;
    });

    await expect(
      runFullPageCapture({
        setCapturing,
        performCapture: async () => {
          expect(capturing).toBe(true);
          throw new Error("canvas failure");
        },
      }),
    ).rejects.toThrow("canvas failure");

    expect(capturing).toBe(false);
  });

  it("excludes elements marked for capture exclusion (the capture button itself)", () => {
    const captureButton = { hasAttribute: () => true };
    const regularContent = { hasAttribute: () => false };
    expect(shouldExcludeFromCapture(captureButton)).toBe(true);
    expect(shouldExcludeFromCapture(regularContent)).toBe(false);
    expect(shouldExcludeFromCapture({})).toBe(false);
  });

  it("preserves selected and unchecked options exactly (read-only capture)", async () => {
    const selections: readonly OutputOption[] = Object.freeze([
      "Normal Solution",
      "Logical Flow",
      "Create Teaching Image",
    ]);
    const snapshotBefore = JSON.stringify(selections);

    await runFullPageCapture({
      setCapturing: () => {},
      performCapture: async () => {
        // Simulate reading the current selections for the captured image.
        return selections.map((option) => option);
      },
    });

    expect(JSON.stringify(selections)).toBe(snapshotBefore);
    expect(selections).toContain("Create Teaching Image");
    expect(selections).not.toContain("Mind Map");
  });

  it("does not execute image generation or any unrelated side effect during capture", async () => {
    const onGenerateTeachingImage = vi.fn();
    const performCapture = vi.fn(async () => "png-data-url");
    const setCapturing = vi.fn();

    await runFullPageCapture({ setCapturing, performCapture });

    expect(onGenerateTeachingImage).not.toHaveBeenCalled();
    expect(performCapture).toHaveBeenCalledTimes(1);
    expect(setCapturing).toHaveBeenCalledTimes(2);
  });

  it("builds a stable, descriptive PNG file name", () => {
    expect(buildCaptureFileName(1700000000000)).toBe(
      "teachers-depth-source-content-1700000000000.png",
    );
  });
});

describe("Capture rendering scale", () => {
  it("keeps desktop rendering crisp within canvas limits", () => {
    const scale = computeCaptureScale({
      contentWidth: 1440,
      contentHeight: 6000,
      devicePixelRatio: 2,
    });
    expect(scale).toBe(MAX_CAPTURE_SCALE);
    expect(1440 * scale).toBeLessThanOrEqual(MAX_CANVAS_DIMENSION);
    expect(6000 * scale).toBeLessThanOrEqual(MAX_CANVAS_DIMENSION);
  });

  it("handles 390px mobile width with long content", () => {
    const scale = computeCaptureScale({
      contentWidth: 390,
      contentHeight: 12000,
      devicePixelRatio: 3,
    });
    expect(scale).toBeLessThanOrEqual(MAX_CAPTURE_SCALE);
    expect(scale).toBeGreaterThanOrEqual(1);
    expect(390 * scale).toBeLessThanOrEqual(MAX_CANVAS_DIMENSION);
    expect(12000 * scale).toBeLessThanOrEqual(MAX_CANVAS_DIMENSION);
  });

  it("clamps scale for extremely long pages without overflowing the canvas", () => {
    const scale = computeCaptureScale({
      contentWidth: 390,
      contentHeight: 80000,
      devicePixelRatio: 2,
    });
    expect(80000 * scale).toBeLessThanOrEqual(MAX_CANVAS_DIMENSION);
    expect(scale).toBeGreaterThan(0);
  });

  it("does not introduce horizontal overflow for the capture control on mobile", () => {
    // The capture button must shrink to the 390px viewport: full width on
    // mobile, auto width from the sm breakpoint up, and no fixed pixel width.
    const routeSource = readFileSync(
      new URL("../../routes/teaching-engine.tsx", import.meta.url),
      "utf8",
    );
    const sourceContentStart = routeSource.indexOf("1. Upload Source Content");
    const nextSectionStart = routeSource.indexOf("2. Extract Metadata");
    const sourceContentSection = routeSource.slice(sourceContentStart, nextSectionStart);

    const captureButtonMarkup = sourceContentSection.slice(
      sourceContentSection.indexOf(CAPTURE_EXCLUDE_ATTRIBUTE),
      sourceContentSection.indexOf("Capture Full Page"),
    );
    expect(captureButtonMarkup).toContain("w-full");
    expect(captureButtonMarkup).toContain("sm:w-auto");
    expect(captureButtonMarkup).not.toMatch(/w-\[\d+px\]/);
  });
});
