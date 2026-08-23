import { describe, expect, it } from "vitest";
import { formatMathDisplayText } from "@/lib/teaching-engine/mathDisplay";

describe("formatMathDisplayText", () => {
  it("formats superscripts and arithmetic signs", () => {
    const formatted = formatMathDisplayText("2x2 - 5x - 3 = 0\nx2 - 6x + 9 = 0");

    expect(formatted).toContain("2x² − 5x − 3 = 0");
    expect(formatted).toContain("x² − 6x + 9 = 0");
  });

  it("formats subscripts when text is label-like", () => {
    const formatted = formatMathDisplayText("x1\na2\nx1, x2, a1");

    expect(formatted).toContain("x₁");
    expect(formatted).toContain("a₂");
    expect(formatted).toContain("x₁, x₂, a₁");
  });

  it("formats square roots, fractions, and greek symbols", () => {
    const formatted = formatMathDisplayText(
      [
        "Delta = b2 - 4ac",
        "x = (-b +/- sqrt(b2 - 4ac))/2a",
        "alpha + beta = -b/a",
        "alpha beta = c/a",
      ].join("\n"),
    );

    expect(formatted).toContain("Δ = b² − 4ac");
    expect(formatted).toContain("x = (−b ± √(b² − 4ac))/2a");
    expect(formatted).toContain("α + β = −b/a");
    expect(formatted).toContain("α β = c/a");
  });

  it("preserves common readable math operators and geometry notation", () => {
    const formatted = formatMathDisplayText("AB <= CD\nAB * CD\nangle ABC\nx-bar\nd2y/dx2");

    expect(formatted).toContain("AB ≤ CD");
    expect(formatted).toContain("AB × CD");
    expect(formatted).toContain("∠ABC");
    expect(formatted).toContain("x̄");
    expect(formatted).toContain("d²y/dx²");
  });
});
