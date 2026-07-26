import type { QuestionAnalysis } from "@/types/teaching-engine";

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function makeDefaultAnalysis(): QuestionAnalysis {
  return {
    subject: "Not yet identified",
    chapter: "Not yet identified",
    questionType: "General",
    difficulty: "Medium",
    skillsRequired: ["Reasoning"],
    visualRequired: "No",
    formulaRequired: "No",
    examImportance: "Medium",
  };
}

export function analyzeQuestion(questionText: string): QuestionAnalysis {
  const normalized = normalizeText(questionText);

  if (!normalized) {
    return makeDefaultAnalysis();
  }

  if (/\b(triangle|circle|angle|construction|prove|theorem|radius|diameter|tangent|chord|arc|polygon|quadrilateral)\b/.test(normalized)) {
    return {
      subject: "Mathematics",
      chapter: "Geometry",
      questionType: "Proof / Construction",
      difficulty: "Medium",
      skillsRequired: ["Reasoning"],
      visualRequired: "Yes",
      formulaRequired: "No",
      examImportance: "High",
    };
  }

  if (/(equation|quadratic|factorisation|polynomial|simplify|solve)/.test(normalized)) {
    return {
      subject: "Mathematics",
      chapter: "Algebra",
      questionType: "Problem Solving",
      difficulty: "Medium",
      skillsRequired: ["Calculation"],
      visualRequired: "No",
      formulaRequired: "Yes",
      examImportance: "High",
    };
  }

  if (/(diagram|cell|heart|force|energy|electricity|atom|chemical|reaction|photosynthesis|respiration)/.test(normalized)) {
    return {
      subject: "Science",
      chapter: "Concepts",
      questionType: "Conceptual Understanding",
      difficulty: "Medium",
      skillsRequired: ["Observation"],
      visualRequired: "Yes",
      formulaRequired: "No",
      examImportance: "High",
    };
  }

  if (/(grammar|essay|letter|comprehension|poem|story|tense|voice|speech)/.test(normalized)) {
    return {
      subject: "English",
      chapter: "Language",
      questionType: "Writing / Comprehension",
      difficulty: "Medium",
      skillsRequired: ["Expression"],
      visualRequired: "No",
      formulaRequired: "No",
      examImportance: "High",
    };
  }

  if (/(history|geography|civics|economics|constitution|climate|industry|agriculture|democracy)/.test(normalized)) {
    return {
      subject: "Social Studies",
      chapter: "Social Science",
      questionType: "Analytical Understanding",
      difficulty: "Medium",
      skillsRequired: ["Recall"],
      visualRequired: "No",
      formulaRequired: "No",
      examImportance: "High",
    };
  }

  return makeDefaultAnalysis();
}

export { normalizeText };
