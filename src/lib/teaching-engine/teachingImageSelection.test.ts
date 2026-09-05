import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CREATE_TEACHING_IMAGE_OPTION,
  isCreateTeachingImageSelected,
  toggleCreateTeachingImageSelection,
} from "@/lib/teaching-engine/teachingImageSelection";
import type { OutputOption } from "@/types/teaching-engine";

describe("Create Teaching Image selectable state", () => {
  it("reports the unchecked state when the option is absent from workflow state", () => {
    const selected: OutputOption[] = ["Normal Solution", "Logical Flow"];
    expect(isCreateTeachingImageSelected(selected)).toBe(false);
  });

  it("reports the checked state when the option is present in workflow state", () => {
    const selected: OutputOption[] = ["Normal Solution", "Create Teaching Image"];
    expect(isCreateTeachingImageSelected(selected)).toBe(true);
  });

  it("toggles checked -> unchecked while preserving other selections", () => {
    const prev: OutputOption[] = [
      "Normal Solution",
      "Logical Flow",
      "Create Teaching Image",
      "Revision Notes",
    ];
    const next = toggleCreateTeachingImageSelection(prev);

    expect(next).not.toContain(CREATE_TEACHING_IMAGE_OPTION);
    expect(next).toContain("Logical Flow");
    expect(next).toContain("Revision Notes");
    expect(next[0]).toBe("Normal Solution");
    // Original workflow state array must not be mutated.
    expect(prev).toContain("Create Teaching Image");
  });

  it("toggles unchecked -> checked while preserving other selections", () => {
    const prev: OutputOption[] = ["Normal Solution", "Logical Flow"];
    const next = toggleCreateTeachingImageSelection(prev);

    expect(next).toContain(CREATE_TEACHING_IMAGE_OPTION);
    expect(next).toContain("Logical Flow");
    expect(next[0]).toBe("Normal Solution");
    expect(next.filter((item) => item === CREATE_TEACHING_IMAGE_OPTION)).toHaveLength(1);
  });

  it("keeps the selected state intact through the workflow persistence round-trip", () => {
    // useLocalStorage persists this exact array under
    // STORAGE_KEYS.teachingEngineOutputOptions via JSON serialization.
    const selected = toggleCreateTeachingImageSelection(["Normal Solution"]);
    const restored = JSON.parse(JSON.stringify(selected)) as OutputOption[];

    expect(isCreateTeachingImageSelected(restored)).toBe(true);

    const deselected = toggleCreateTeachingImageSelection(selected);
    const restoredDeselected = JSON.parse(JSON.stringify(deselected)) as OutputOption[];
    expect(isCreateTeachingImageSelected(restoredDeselected)).toBe(false);
  });

  it("is available to subsequent workflow logic as a plain output option", () => {
    // The prompt builder and auto-selection logic read selectedOutputOptions
    // directly; the toggled state must therefore be a plain options array.
    const selected = toggleCreateTeachingImageSelection(["Normal Solution"]);
    expect(Array.isArray(selected)).toBe(true);
    expect(selected).toEqual(["Normal Solution", "Create Teaching Image"]);
  });
});

describe("Create Teaching Image selectable control wiring", () => {
  const workflowSource = readFileSync(
    new URL("../../components/teaching-engine/MasterImageWorkflow.tsx", import.meta.url),
    "utf8",
  );

  it("renders a tickable checkbox control instead of a one-way action", () => {
    expect(workflowSource).toContain('role="checkbox"');
    expect(workflowSource).toContain('aria-label="Create Teaching Image"');
    expect(workflowSource).toContain("aria-checked={createTeachingImageSelected}");
  });

  it("toggling the control only changes selection state and never executes generation", () => {
    // The checkbox toggles selection via onToggleCreateTeachingImage; the
    // generation call must not be wired to the selection control.
    expect(workflowSource).toContain("onClick={onToggleCreateTeachingImage}");
    const checkboxBlock = workflowSource.slice(
      workflowSource.indexOf('aria-label="Create Teaching Image"'),
    );
    const checkboxButton = checkboxBlock.slice(0, checkboxBlock.indexOf("</button>"));
    expect(checkboxButton).not.toContain("onGenerateTeachingImage");
  });

  it("gates explicit generation behind the selected state", () => {
    expect(workflowSource).toContain(
      "disabled={!createTeachingImageSelected || !canGenerateImage || isGeneratingImage}",
    );
  });
});
