import { describe, expect, it } from "vitest";
import { searchEducationContent } from "@/lib/search-index";

describe("searchEducationContent", () => {
  it("returns real educational content for core queries", () => {
    const electricity = searchEducationContent("Electricity");
    const ohmsLaw = searchEducationContent("Ohm's Law");
    const algebra = searchEducationContent("Algebra");
    const linearEquation = searchEducationContent("linear equation");
    const grammar = searchEducationContent("Grammar");

    expect(electricity.length).toBeGreaterThan(0);
    expect(ohmsLaw.length).toBeGreaterThan(0);
    expect(algebra.length).toBeGreaterThan(0);
    expect(linearEquation.length).toBeGreaterThan(0);
    expect(grammar.length).toBeGreaterThan(0);
  });

  it("does not route results back to search query pages", () => {
    const results = searchEducationContent("Electricity");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((item) => !item.href.startsWith("/search?q="))).toBe(true);
  });

  it("returns no results when educational content is not available", () => {
    const hindi = searchEducationContent("Hindi");
    const marathi = searchEducationContent("Marathi");
    const computer = searchEducationContent("Computer");

    expect(hindi).toHaveLength(0);
    expect(marathi).toHaveLength(0);
    expect(computer).toHaveLength(0);
  });

  it("does not expose internal prompt-builder labels in result metadata", () => {
    const results = searchEducationContent("Prompt Builder Engine");
    expect(results).toHaveLength(0);

    const electricityResults = searchEducationContent("Electricity");
    const joined = electricityResults
      .map((item) => `${item.title} ${item.chapter} ${item.topic ?? ""} ${item.excerpt}`.toLowerCase())
      .join(" ");

    expect(joined.includes("output options")).toBe(false);
    expect(joined.includes("generate prompt")).toBe(false);
  });
});
