import { describe, expect, it } from "vitest";

import { buildAiPackageText } from "./aiPackage";

describe("buildAiPackageText", () => {
  it("includes the original screenshot names and the visual-ground-truth instruction", () => {
    const text = buildAiPackageText(
      "Generate a student-friendly explanation.",
      [
        { name: "screenshot-1.png", type: "image/png" },
        { name: "screenshot-2.jpg", type: "image/jpeg" },
      ],
      "OCR text example",
    );

    expect(text).toContain("Use the attached original screenshot(s) as the visual ground truth");
    expect(text).toContain("screenshot-1.png");
    expect(text).toContain("screenshot-2.jpg");
    expect(text).toContain("Generate a student-friendly explanation.");
  });
});
