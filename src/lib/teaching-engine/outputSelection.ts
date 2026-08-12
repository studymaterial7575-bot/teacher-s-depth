import type { ExtractedContent, OutputOption, StudentProfileOption } from "@/types/teaching-engine";

type DeepLearningOutputOption = Exclude<OutputOption, "Normal Solution">;

type AutoSelectionInput = {
  extracted: ExtractedContent;
  studentProfile: StudentProfileOption[];
  objective: string;
};

const STEM_SUBJECTS = new Set(["Mathematics", "Physics", "Chemistry", "Biology", "Computer", "Commerce"]);
const LANGUAGE_SUBJECTS = new Set(["English", "Hindi", "Marathi"]);
const SOCIAL_SUBJECTS = new Set(["History", "Geography", "Social Science", "Civics", "Economics"]);

function asNormalizedSet(values: string[]) {
  return new Set(values.map((value) => value.toLowerCase().trim()).filter(Boolean));
}

function addOption(bucket: Set<OutputOption>, option: OutputOption) {
  if (option !== "Normal Solution") {
    bucket.add(option);
  }
}

function hasAnySignal(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function getAutoRelevantOutputOptions(input: AutoSelectionInput): OutputOption[] {
  const { extracted, studentProfile, objective } = input;
  const selected = new Set<OutputOption>(["Normal Solution"]);
  const subject = extracted.subject.trim();
  const questionTypeText = `${extracted.questionType} ${(extracted.questionTypes ?? []).join(" ")}`.toLowerCase();
  const keywordSet = asNormalizedSet(extracted.keywords ?? []);
  const lowerText = `${extracted.ocrText} ${extracted.topic} ${extracted.chapter} ${objective}`.toLowerCase();
  const profileSet = asNormalizedSet(studentProfile);

  if (STEM_SUBJECTS.has(subject)) {
    [
      "Background",
      "Formula Breakdown",
      "Logical Flow",
      "Common Mistakes",
      "Practice Questions",
      "Revision Notes",
    ].forEach((option) => addOption(selected, option as OutputOption));
  } else if (LANGUAGE_SUBJECTS.has(subject)) {
    [
      "Background",
      "Logical Flow",
      "Word Meanings",
      "Grammar Explanation",
      "Usage",
      "Examples",
      "Common Errors",
      "Practice Questions",
      "Revision Notes",
    ].forEach((option) => addOption(selected, option as OutputOption));
  } else if (SOCIAL_SUBJECTS.has(subject)) {
    [
      "Background",
      "Logical Flow",
      "Exam Importance",
      "Cause and Effect",
      "Practice Questions",
      "Revision Notes",
      "Timeline",
    ].forEach((option) => addOption(selected, option as OutputOption));
  } else {
    ["Logical Flow", "Common Mistakes", "Practice Questions", "Revision Notes"].forEach((option) =>
      addOption(selected, option as OutputOption),
    );
  }

  const hasFormulaNeed =
    extracted.formulae.length > 0 ||
    keywordSet.has("formula") ||
    hasAnySignal(lowerText, [/\b(focus|focal|mirror formula|v\s*=\s*i\s*r|\d+\s*\/\s*[fuvm])\b/i]);
  if (hasFormulaNeed) {
    addOption(selected, "Formula Breakdown");
  }

  const hasVisualNeed =
    questionTypeText.includes("diagram") ||
    extracted.diagrams.length > 0 ||
    hasAnySignal(lowerText, [/\b(draw|label|sketch|figure|diagram|concave|convex|mirror|ray)\b/i]);
  if (hasVisualNeed) {
    addOption(selected, "Visual Explanation");
    addOption(selected, "Dissected Visual");
    addOption(selected, "Create Teaching Image");
  }

  const examDriven =
    profileSet.has("exam preparation") ||
    profileSet.has("quick revision") ||
    hasAnySignal(lowerText, [/\b(board|exam|past\s*paper|revision|important)\b/i]);
  if (examDriven) {
    addOption(selected, "Exam Importance");
    addOption(selected, "Practice Questions");
    addOption(selected, "Revision Notes");
    addOption(selected, "Memory Tricks");
  }

  if (profileSet.has("step-by-step explanation") || profileSet.has("very weak")) {
    addOption(selected, "Logical Flow");
    addOption(selected, "Real-life Analogy");
  }

  if (profileSet.has("visual learner")) {
    addOption(selected, "Visual Explanation");
    addOption(selected, "Dissected Visual");
  }

  const needsFlowchart = hasAnySignal(lowerText, [/\b(process|steps|sequence|cycle|stages?)\b/i]);
  if (needsFlowchart) {
    addOption(selected, "Flowchart");
  }

  const needsMindMap = hasAnySignal(lowerText, [/\b(compare|comparison|interlink|overview|classification)\b/i]);
  if (needsMindMap) {
    addOption(selected, "Mind Map");
  }

  const ordered = Array.from(selected);
  const pinned: OutputOption[] = [
    "Normal Solution",
    "Background",
    "Formula Breakdown",
    "Logical Flow",
    "Visual Explanation",
    "Dissected Visual",
    "Real-life Analogy",
    "Exam Importance",
    "Common Mistakes",
    "Memory Tricks",
    "Practice Questions",
    "Revision Notes",
    "Word Meanings",
    "Grammar Explanation",
    "Usage",
    "Examples",
    "Common Errors",
    "Timeline",
    "Map Explanation",
    "Cause and Effect",
    "Flowchart",
    "Mind Map",
    "Infographic",
    "Create Teaching Image",
  ];

  const sorted = pinned.filter((option) => ordered.includes(option));
  const deepFunctions = sorted.filter((option) => option !== "Normal Solution");

  const mustKeep: DeepLearningOutputOption[] = [
    "Logical Flow",
    "Common Mistakes",
    "Practice Questions",
    "Revision Notes",
  ];
  if (hasFormulaNeed) mustKeep.push("Formula Breakdown");
  if (hasVisualNeed) mustKeep.push("Visual Explanation", "Create Teaching Image");
  if (examDriven) mustKeep.push("Exam Importance");

  const prioritized = mustKeep.filter((option, index) => deepFunctions.includes(option) && mustKeep.indexOf(option) === index);
  const bounded = [...prioritized];
  for (const option of deepFunctions) {
    if (bounded.includes(option)) continue;
    if (bounded.length >= 8) break;
    bounded.push(option);
  }

  return ["Normal Solution", ...bounded];
}
