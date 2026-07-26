import type { ModuleName } from "@/types/teaching-engine";

export function buildPromptText({
  selectedModules,
  questions,
  fileName,
}: {
  selectedModules: ModuleName[];
  questions: string;
  fileName: string | null;
}) {
  const moduleList = selectedModules.length > 0 ? selectedModules.map((module) => `- ${module}`).join("\n") : "- None selected";
  const questionText = questions.trim().length > 0 ? questions.trim() : "[Enter your question here]";
  const sourceLabel = fileName ? fileName : "[Upload a PDF or screenshot]";

  return `Subject: ${sourceLabel}
Board: [Enter board]
Class: [Enter class]
Question:
${questionText}
Objective: Explain the concept clearly and help the learner solve the problem with confidence.

Selected Teaching Modules:
${moduleList}

Instructions for ChatGPT:
- Act as a supportive teacher.
- Begin with the simplest understanding.
- Build a logical flow of ideas.
- Use visual examples or analogies where helpful.
- Highlight formulas and key steps.
- Mention common mistakes to avoid.
- Connect the explanation to exam importance.
- Keep the response structured and student-friendly.

Desired Output Format:
1. Short answer or direct result
2. Step-by-step explanation
3. Simple visual analogy or example
4. Formula summary if relevant
5. Common mistakes to avoid
6. Exam tip`;
}
