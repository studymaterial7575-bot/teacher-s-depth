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
    selectedOutputOptions,
    visualStyle,
    explanationStyle,
    objective,
  } = input;

  const fileList = sourceFiles.length > 0 ? sourceFiles : ["No files attached"];
  const profileList = studentProfile.length > 0 ? studentProfile : ["Average"];
  const depthList = depthOptions.length > 0 ? depthOptions : ["Definition", "Worked examples"];
  const outputOptions = selectedOutputOptions.length > 0 ? selectedOutputOptions : ["Normal Solution"];
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
- Question type (primary): ${extracted.questionType}
- Question types detected: ${extracted.questionTypes.length > 0 ? extracted.questionTypes.join(" | ") : "Not identified"}
- Language: ${extracted.language}
- Contains tables: ${extracted.hasTables ? "Yes" : "No"}
- Contains exercises: ${extracted.hasExercises ? "Yes" : "No"}
- Exam importance: ${extracted.examImportance}
- Formulae: ${extracted.formulae.length > 0 ? extracted.formulae.join(" | ") : "Not identified"}
- Numerical questions: ${extracted.numericalQuestions.length > 0 ? extracted.numericalQuestions.join(" | ") : "Not identified"}
- Diagrams: ${extracted.diagrams.length > 0 ? extracted.diagrams.join(" | ") : "Not identified"}
- Keywords: ${extracted.keywords.length > 0 ? extracted.keywords.join(", ") : "Not identified"}
- OCR text:
${ocrPreview}

${block("STUDENT PROFILE", profileList)}

${block("TEACHING DEPTH REQUIRED", depthList)}

${block("SELECTED OUTPUT OPTIONS", outputOptions)}

REQUIRED VISUAL STYLE:
- ${visualStyle}

REQUIRED EXPLANATION STYLE:
- ${explanationStyle}

TEACHING OBJECTIVE:
- ${objectiveLine}

OUTPUT FORMATTING INSTRUCTIONS:
- Respond in exactly three sections with these headings:
  1) SECTION 1: Normal Solution
  2) SECTION 2: Scrollable Deep Learning Section
  3) SECTION 3: Create Teaching Image
- SECTION 1 must always be concise and immediately usable in tuition/class.
- SECTION 2 must include only requested output options except Normal Solution and Create Teaching Image.
- SECTION 3 must provide one comprehensive infographic blueprint covering all selected topics.
- Use plain text only.
- Use bullet points for recall-heavy parts.
- Keep language aligned with the selected learner profile and detected document language.
- If formulas are used, explain variables before substitution.
- If visuals are required, describe board-drawing layout and labeling steps.
- For social science include timeline/map when selected. For languages include grammar/word-meaning when selected.
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
