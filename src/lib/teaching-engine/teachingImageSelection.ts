import { OUTPUT_OPTIONS, type OutputOption } from "@/types/teaching-engine";

/**
 * "Create Teaching Image" is a SELECTABLE workflow step, not an immediate action.
 *
 * The single source of truth for its selected state is the existing
 * `selectedOutputOptions` workflow state (persisted under
 * STORAGE_KEYS.teachingEngineOutputOptions). These helpers read/toggle that
 * state immutably so both the Output Options list (section 3) and the
 * Master Learning Image Workflow (STEP 3) stay in sync without duplicating
 * state. Ticking the option only marks the step as included — it never
 * executes image generation.
 */
export const CREATE_TEACHING_IMAGE_OPTION = "Create Teaching Image" satisfies OutputOption;

const PRIMARY_OUTPUT_OPTION: OutputOption = "Normal Solution";

function sanitizeOptions(prev: readonly string[]): OutputOption[] {
  const safe = prev.filter(
    (item): item is OutputOption =>
      item !== PRIMARY_OUTPUT_OPTION && (OUTPUT_OPTIONS as readonly string[]).includes(item),
  );
  return [...new Set(safe)];
}

/** True when "Create Teaching Image" is ticked in the workflow state. */
export function isCreateTeachingImageSelected(selectedOutputOptions: readonly string[]): boolean {
  return selectedOutputOptions.includes(CREATE_TEACHING_IMAGE_OPTION);
}

/**
 * Returns the next workflow state with "Create Teaching Image" toggled.
 * - Unchecked -> checked: the option is appended once.
 * - Checked -> unchecked: the option is removed.
 * - "Normal Solution" (primary output) is always preserved.
 * - Unknown/duplicate entries are cleaned up, matching existing route behavior.
 */
export function toggleCreateTeachingImageSelection(
  prev: readonly OutputOption[],
): OutputOption[] {
  const next = sanitizeOptions(prev);
  const withoutOption = next.filter(
    (item): item is OutputOption => item !== CREATE_TEACHING_IMAGE_OPTION,
  );
  const toggled: OutputOption[] = next.includes(CREATE_TEACHING_IMAGE_OPTION)
    ? withoutOption
    : [...withoutOption, CREATE_TEACHING_IMAGE_OPTION];
  return [PRIMARY_OUTPUT_OPTION, ...toggled];
}
