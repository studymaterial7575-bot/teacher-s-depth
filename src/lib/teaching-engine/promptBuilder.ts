import type { PromptBuilderInput } from "@/types/teaching-engine";

function block(title: string, lines: string[]) {
  return `${title}:\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

function buildSinglePrompt(input: PromptBuilderInput) {
  const {
    sourceFiles,
    extracted,
    studentProfile,
    depthOptions,
    visualStyle,
    explanationStyle,
    objective,
  } = input;

  const fileList = sourceFiles.length > 0 ? sourceFiles : ["No files attached"];
  const profileList = studentProfile.length > 0 ? studentProfile : ["Average"];
  const depthList = depthOptions.length > 0 ? depthOptions : ["Definition", "Worked examples"];
  const objectiveLine = objective.trim() || "Generate a clear classroom-ready explanation for this learner.";
  const ocrPreview = extracted.ocrText.trim() || "No OCR text provided. Use extracted metadata and inferred chapter context.";

  return `You are generating a teaching response from classroom content. This is not a chatbot conversation.
Create a high-quality educational output exactly using the constraints below.

${block("SOURCE MATERIAL", fileList)}

EXTRACTED CONTENT:
- Subject: ${extracted.subject}
- Board: ${extracted.board}
- Class: ${extracted.classLevel}
- Chapter: ${extracted.chapter}
- Topic: ${extracted.topic}
- Question type: ${extracted.questionType}
- Formulae: ${extracted.formulae.length > 0 ? extracted.formulae.join(" | ") : "Not identified"}
- Numerical questions: ${extracted.numericalQuestions.length > 0 ? extracted.numericalQuestions.join(" | ") : "Not identified"}
- Diagrams: ${extracted.diagrams.length > 0 ? extracted.diagrams.join(" | ") : "Not identified"}
- Keywords: ${extracted.keywords.length > 0 ? extracted.keywords.join(", ") : "Not identified"}
- OCR text:
${ocrPreview}

${block("STUDENT PROFILE", profileList)}

${block("TEACHING DEPTH REQUIRED", depthList)}

REQUIRED VISUAL STYLE:
- ${visualStyle}

REQUIRED EXPLANATION STYLE:
- ${explanationStyle}

TEACHING OBJECTIVE:
- ${objectiveLine}

OUTPUT FORMATTING INSTRUCTIONS:
- Use clear section headings with this exact order:
  1) Quick context
  2) Core explanation
  3) Visual plan
  4) Worked examples
  5) Common mistakes and corrections
  6) Revision and memory support
  7) Practice or viva set
- Use plain text only.
- Use bullet points for recall-heavy parts.
- Keep language aligned with the selected learner profile.
- If formulas are used, explain variables before substitution.
- If visuals are required, describe the diagram layout step-by-step so a teacher can draw it on board.
- End with a short "Teacher delivery note" in 2-3 lines.

Do not ask follow-up questions. Generate the full educational response now.`;
}

export function buildPromptText(input: PromptBuilderInput) {
  return buildSinglePrompt(input);
}

export function buildPromptTexts(input: PromptBuilderInput) {
  const extractedItems = input.extractedItems && input.extractedItems.length > 0
    ? input.extractedItems
    : [input.extracted];

  return extractedItems.map((item) =>
    buildSinglePrompt({
      ...input,
      extracted: item,
      extractedItems: undefined,
    }),
  );
}
