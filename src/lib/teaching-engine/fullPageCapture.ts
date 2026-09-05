/**
 * Full-page capture for the Source Content workflow.
 *
 * Captures the ACTUAL rendered DOM (via html-to-image, which rasterizes the
 * real browser rendering through SVG foreignObject) so the resulting image
 * shows selections exactly as rendered: ticked options stay ticked, unticked
 * options stay unticked, and the "Create Teaching Image" selected state is
 * visible. This approach is required because the design system uses oklch /
 * color-mix colors, which CSS-reparser-based tools (e.g. html2canvas) cannot
 * handle. Capture is strictly read-only:
 * - it never mutates workflow/selection state,
 * - it never triggers teaching-image generation,
 * - it temporarily excludes the capture control itself via
 *   `data-capture-exclude` and restores it immediately afterwards.
 */

/** Elements carrying this attribute are left out of the captured image. */
export const CAPTURE_EXCLUDE_ATTRIBUTE = "data-capture-exclude";

/** Largest canvas side we allow (px). Chrome/Firefox cap canvases near 16384px. */
export const MAX_CANVAS_DIMENSION = 15000;
/** Preferred maximum rasterization scale for crisp output on retina screens. */
export const MAX_CAPTURE_SCALE = 2;
/** Absolute floor for the rasterization scale; the canvas limit always wins. */
export const MIN_CAPTURE_SCALE = 0.05;

export type CaptureScaleInput = {
  contentWidth: number;
  contentHeight: number;
  devicePixelRatio?: number;
};

/**
 * Computes a render scale that keeps the produced canvas inside browser
 * canvas-size limits for both desktop (~1440px) and ~390px mobile widths,
 * including very long pages. The canvas limit is a hard constraint, so the
 * result is rounded DOWN to two decimals to guarantee it is never exceeded.
 */
export function computeCaptureScale(input: CaptureScaleInput): number {
  const width = Math.max(1, input.contentWidth);
  const height = Math.max(1, input.contentHeight);
  const preferred = Math.min(input.devicePixelRatio || 1, MAX_CAPTURE_SCALE);
  const scale = Math.min(
    preferred,
    MAX_CANVAS_DIMENSION / width,
    MAX_CANVAS_DIMENSION / height,
  );
  return Math.max(MIN_CAPTURE_SCALE, Math.floor(scale * 100) / 100);
}

/** Minimal structural type so the predicate stays unit-testable without a DOM. */
export type CaptureElementLike = {
  hasAttribute?: (name: string) => boolean;
};

/** html-to-image `filter` predicate: hides the capture control itself. */
export function shouldExcludeFromCapture(element: CaptureElementLike): boolean {
  return typeof element.hasAttribute === "function"
    ? element.hasAttribute(CAPTURE_EXCLUDE_ATTRIBUTE)
    : false;
}

export function buildCaptureFileName(timestamp: number): string {
  return `teachers-depth-source-content-${timestamp}.png`;
}

export type CaptureResult = {
  dataUrl: string;
  width: number;
  height: number;
};

/**
 * Rasterizes the given rendered element to a PNG data URL.
 * Client-side only — html-to-image is imported lazily so SSR bundles stay clean.
 */
export async function captureElementToPngDataUrl(target: HTMLElement): Promise<CaptureResult> {
  const { toPng } = await import("html-to-image");

  const contentWidth = Math.max(target.scrollWidth, target.offsetWidth);
  const contentHeight = Math.max(target.scrollHeight, target.offsetHeight);
  const scale = computeCaptureScale({
    contentWidth,
    contentHeight,
    devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
  });

  const bodyBackground =
    typeof document !== "undefined"
      ? window.getComputedStyle(document.body).backgroundColor
      : "";
  const backgroundColor =
    bodyBackground && bodyBackground !== "rgba(0, 0, 0, 0)" && bodyBackground !== "transparent"
      ? bodyBackground
      : "#0b1020";

  const dataUrl = await toPng(target, {
    pixelRatio: scale,
    backgroundColor,
    cacheBust: true,
    filter: (node) => !shouldExcludeFromCapture(node as CaptureElementLike),
  });

  return {
    dataUrl,
    width: Math.round(contentWidth * scale),
    height: Math.round(contentHeight * scale),
  };
}

/** Triggers a browser download for a captured PNG data URL. */
export function downloadDataUrl(dataUrl: string, fileName: string): void {
  if (typeof document === "undefined") return;
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * Capture orchestration with hide/restore semantics.
 *
 * `setCapturing(true)` runs BEFORE the capture starts (the UI uses this state
 * to mark the capture control as in-progress), and `setCapturing(false)` runs
 * in a `finally` block so the control is ALWAYS restored — even when capture
 * fails. The workflow state is never touched here: selections stay exactly as
 * the user left them and no generation step is executed.
 */
export async function runFullPageCapture<T>(deps: {
  setCapturing: (capturing: boolean) => void;
  performCapture: () => Promise<T>;
}): Promise<T> {
  deps.setCapturing(true);
  try {
    return await deps.performCapture();
  } finally {
    deps.setCapturing(false);
  }
}
