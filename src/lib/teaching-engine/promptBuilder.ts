import { OUTPUT_OPTIONS, type PromptBuilderInput } from "@/types/teaching-engine";

export type InterestSignal = {
  kind: "ghost_story" | "unknown";
  confidence: number;
  rawText: string;
};

const GHOST_STORY_KEYWORDS = [
  "ghost story",
  "real ghost story",
  "ghost stories",
  "haunted place",
  "haunted places",
  "haunted house",
  "haunted houses",
  "haunted building",
  "haunted buildings",
  "paranormal",
  "real paranormal",
  "supernatural incident",
  "unexplained event",
  "unexplained events",
  "spirit",
  "ghost episode",
  "ghost episodes",
  "haunted location",
  "real ghost",
  "real ghosts",
  "paranormal incident",
  "paranormal incidents",
  "ghostly encounter",
  "haunted story",
  "real haunted",
  "famous haunted house",
  "haunted house story",
  "ghost story episode",
  "youtube ghost story",
  "ghost story on youtube",
];

const POSITIVE_GHOST_SIGNALS = [
  "students love",
  "students really like",
  "interested in",
  "tell me about",
  "find me",
  "real ghost story",
  "real ghost stories",
  "haunted place",
  "haunted places",
  "many ghost stories",
  "ghost stories on youtube",
  "many ghost story episodes",
  "real paranormal story",
  "ghost story episode",
  "haunted story",
  "what actually happened in this famous haunted house",
  "real haunted places",
  "ghost story from india",
  "ghost stories from india",
  "ghost story on youtube",
  "youtube ghost story",
];

const CITY_HINTS = [
  "mumbai",
  "delhi",
  "kolkata",
  "chennai",
  "bengaluru",
  "bangalore",
  "hyderabad",
  "pune",
  "jaipur",
  "goa",
  "lucknow",
  "ahmedabad",
  "surat",
];

function block(title: string, lines: string[]) {
  return `${title}:\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

function buildContentIsolationRules() {
  return block("CONTENT ISOLATION RULES", [
    "SOURCE CONTENT ONLY: use only what is directly supported by the current source, OCR text, and current extracted metadata.",
    "IMPORTANT ADDITIONAL EXAM COVERAGE: add only same-topic support that is missing from the current source and label it as additional coverage.",
    "Do not reuse previous teaching context, earlier prompts, earlier questions, or stale extracted metadata.",
    "Do not present additional coverage as if it came from the uploaded source.",
  ]);
}

export function detectGhostStoryInterest(input: string): InterestSignal {
  const normalized = input.toLowerCase();

  const matchedKeywords = GHOST_STORY_KEYWORDS.filter((keyword) => normalized.includes(keyword));
  const matchedSignals = POSITIVE_GHOST_SIGNALS.filter((phrase) => normalized.includes(phrase));
  const locationHint = CITY_HINTS.find((city) => normalized.includes(city));

  if (matchedKeywords.length === 0 && matchedSignals.length === 0) {
    return { kind: "unknown", confidence: 0, rawText: input };
  }

  const confidence = Math.min(
    0.99,
    0.45 + matchedKeywords.length * 0.12 + matchedSignals.length * 0.1 + (locationHint ? 0.05 : 0),
  );

  return { kind: "ghost_story", confidence, rawText: input };
}

export function createResearchPrompt(rawInput: string): string {
  const signal = detectGhostStoryInterest(rawInput);
  if (signal.kind !== "ghost_story") {
    return "";
  }

  const locationHint = CITY_HINTS.find((city) => rawInput.toLowerCase().includes(city));
  const locationLine = locationHint ? `Focus on a reported paranormal or ghost story connected to ${locationHint}.` : "Focus on a reported paranormal or ghost story that is suitable for classroom discussion.";

  return `ENTERTAINMENT + CURIOSITY + REAL-WORLD STORY

Create a standalone research prompt for ChatGPT.

${locationLine}

Investigate a reported paranormal or ghost-story claim in a curious, evidence-aware way.
Do not automatically accept or reject the story. Instead, explain what is documented, what is alleged, what is folklore, and what remains unexplained.

Requirements:
- What happened?
- Where and when did it happen?
- Who reported the experience?
- Who was involved?
- What is the complete sequence of events?
- What evidence exists?
- What do witnesses claim they experienced?
- What do investigators, historians, local records, or reliable reporting say?
- Are there alternative explanations, such as environmental, psychological, historical, or ordinary causes?
- Why did the story become famous or widely discussed?
- Are there multiple versions of the story?
- What reliable sources report
- Whether photographs, videos, recordings, or local records exist and what they actually establish
- What remains genuinely unexplained
- What is fact, what is belief, and what is folklore?
- The difference between a YouTube story, a news report, a local legend, and original reporting

Critical instruction:
Do not present paranormal or supernatural claims as scientifically proven simply because witnesses, YouTube videos, newspapers, documentaries, or storytellers describe them as real.

Clearly distinguish:
1. Verified facts
2. Witness claims
3. Historical or folklore accounts
4. Media reports
5. YouTube claims
6. Unverified stories
7. Documented events
8. Alleged supernatural explanations
9. Possible scientific or ordinary explanations
10. Genuinely unresolved aspects

If evidence is weak or unavailable, say so clearly.

source verification:
Investigate the claim carefully and compare sources instead of simply repeating the YouTube narration.
Follow this chain where relevant:
YouTube story
↓
Underlying claim
↓
original/reliable reporting
↓
Witness accounts
↓
Historical evidence
↓
Alternative explanations
↓
What can actually be established?

Ask ChatGPT to tell the story in an engaging, suspenseful, conversational, age-appropriate and easy-to-follow way.
Keep it rich in details without inventing events or presenting folklore as fact.

The audience should feel: "I want to know what happened next."

Discussion-friendly ending:
- 3–5 interesting questions for students
- "What happened?"
- "What do you think happened?"
- "What evidence supports the story?"
- "What could have another explanation?"
- "What remains unexplained?"

Do not ridicule the topic, and do not automatically dismiss it.
Do not invent supernatural events to make the story more exciting.
Do not present hearsay as fact. Separate claims, evidence, and uncertainty clearly.

Input context:
"${rawInput}"
`.trim();
}

export function parseOutputSelectionNumbers(rawInput: string, options: readonly string[]): string[] {
  const available = new Set(options);
  const parsed = rawInput
    .split(",")
    .flatMap((entry) => entry.split(/\s+/))
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => Number.parseInt(token, 10))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= options.length);

  const selected = new Set<string>();
  for (const value of parsed) {
    const option = options[value - 1];
    if (option && available.has(option)) {
      selected.add(option);
    }
  }

  return Array.from(selected);
}

export function getNumberedOutputOptions(options: readonly string[]) {
  return options.map((option, index) => ({
    number: index + 1,
    name: option,
    label: `${String(index + 1).padStart(2, "0")} ${option}`,
  }));
}

export function formatExamImportanceEvidence(rawValue: string | undefined): string {
  const value = (rawValue ?? "").trim();
  if (!value) return "Past-paper frequency unavailable";

  const normalized = value.toLowerCase();
  if (normalized.includes("past-paper") || normalized.includes("appeared in past papers") || normalized.includes("exact/near-exact") || normalized.includes("related questions")) {
    return value;
  }

  if (["not identified", "unknown", "high", "medium", "low", "very high", "very low"].includes(normalized)) {
    return "Past-paper frequency unavailable";
  }

  return "Past-paper frequency unavailable";
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
  const numberedOutputOptions = getNumberedOutputOptions(OUTPUT_OPTIONS).filter(({ name }) => outputOptions.includes(name as any));
  const objectiveLine = objective.trim() || "Generate a clear classroom-ready explanation for this learner.";
  const ocrPreview = extracted.ocrText.trim() || "No OCR text provided. Use extracted metadata and inferred chapter context.";
  const examEvidence = formatExamImportanceEvidence(extracted.examImportance);

  return `You are generating a teaching response from classroom content. This is not a chatbot conversation.
Create a high-quality educational output exactly using the constraints below.

${buildContentIsolationRules()}

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
- Exam importance: ${examEvidence}
- Formulae: ${extracted.formulae.length > 0 ? extracted.formulae.join(" | ") : "Not identified"}
- Numerical questions: ${extracted.numericalQuestions.length > 0 ? extracted.numericalQuestions.join(" | ") : "Not identified"}
- Diagrams: ${extracted.diagrams.length > 0 ? extracted.diagrams.join(" | ") : "Not identified"}
- Keywords: ${extracted.keywords.length > 0 ? extracted.keywords.join(", ") : "Not identified"}
- OCR text:
${ocrPreview}

${block("STUDENT PROFILE", profileList)}

${block("TEACHING DEPTH REQUIRED", depthList)}

${block("SELECTED OUTPUT NUMBERS AND OPTIONS", numberedOutputOptions.length > 0 ? numberedOutputOptions.map((item) => item.label) : ["01 Normal Solution"])}
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
- Normal Solution must remain the main output and always be visible before the deep-learning section.
- Use plain text only.
- Use bullet points for recall-heavy parts.
- Keep language aligned with the selected learner profile and detected document language.
- If formulas are used, explain variables before substitution.
- If visuals are required, describe board-drawing layout and labeling steps.
- For social science include timeline/map when selected. For languages include grammar/word-meaning when selected.
- End with a short "Teacher delivery note" in 2-3 lines.
- If past-paper data is unavailable, explicitly state: Past-paper frequency unavailable.

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
