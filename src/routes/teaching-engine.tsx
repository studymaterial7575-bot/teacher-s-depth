import { createFileRoute } from "@tanstack/react-router";
import { Camera, Check, FileText, GraduationCap, Loader2, Presentation, Sparkles, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MasterImageWorkflow } from "@/components/teaching-engine/MasterImageWorkflow";
import { PromptPreview } from "@/components/teaching-engine/PromptPreview";
import { extractAcademicQuestions } from "@/lib/teaching-engine/academicExtractor";
import { getAutoRelevantOutputOptions } from "@/lib/teaching-engine/outputSelection";
import { buildPromptTexts } from "@/lib/teaching-engine/promptBuilder";
import {
  clearTeachingEngineFiles,
  loadTeachingEngineFiles,
  saveTeachingEngineFiles,
} from "@/lib/teaching-engine/persistence";
import { STORAGE_KEYS, useLocalStorage } from "@/lib/storage";
import {
  DEPTH_OPTIONS,
  EXPLANATION_STYLE_OPTIONS,
  OUTPUT_OPTIONS,
  STUDENT_PROFILE_OPTIONS,
  VISUAL_STYLE_OPTIONS,
  type DepthOption,
  type ExplanationStyleOption,
  type ExtractedContent,
  type OutputOption,
  type StudentProfileOption,
  type VisualStyleOption,
} from "@/types/teaching-engine";

type TeachingEngineSearch = {
  entry?: "screenshot" | "pdf" | "camera";
};

type BuildStageId = "ocr" | "question-detection" | "subject-detection" | "metadata" | "prompt-generation";
type BuildStageStatus = "pending" | "in-progress" | "completed";

type BuildStage = {
  id: BuildStageId;
  label: string;
  status: BuildStageStatus;
};

type WorkflowStep = "upload" | "ocr" | "profile" | "depth" | "generate" | "preview";

type SourceExtractionContext = {
  sourceFiles: string[];
  extractedText: string;
  extractionStage: "ready" | "needs-review" | "unavailable" | "pending";
  confidenceLabel: "High" | "Medium" | "Low";
  confidenceNote: string;
  metadata: {
    subject: string;
    classLevel: string;
    board: string;
    chapter: string;
    topic: string;
    questionType: string;
    language: string;
    formulaCount: number;
    diagramCount: number;
  };
};

export const Route = createFileRoute("/teaching-engine")({
  validateSearch: (search: Record<string, unknown>): TeachingEngineSearch => ({
    entry:
      search.entry === "screenshot" || search.entry === "pdf" || search.entry === "camera"
        ? search.entry
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Prompt Builder Engine — Teacher's Depth" },
      {
        name: "description",
        content:
          "Generate structured, high-quality educational prompts for ChatGPT from local teaching inputs.",
      },
    ],
  }),
  component: RouteComponent,
});

const DEFAULT_EXTRACTED: ExtractedContent = {
  ocrText: "",
  subject: "Not identified",
  board: "Not identified",
  classLevel: "Not identified",
  chapter: "Not identified",
  topic: "Not identified",
  concept: "Not identified",
  questionType: "Not identified",
  questionTypes: [],
  language: "Not identified",
  hasTables: false,
  hasExercises: false,
  examImportance: "Not identified",
  formulae: [],
  formulaDetails: [],
  numericalQuestions: [],
  diagrams: [],
  keywords: [],
};

const DEFAULT_STUDENT_PROFILE: StudentProfileOption[] = [];
const DEFAULT_DEPTH_OPTIONS: DepthOption[] = ["Definition", "Worked examples", "Common mistakes", "Revision notes"];
const DEFAULT_OUTPUT_OPTIONS: OutputOption[] = ["Normal Solution"];
const DEFAULT_VISUAL_STYLE: VisualStyleOption = "Simple labeled diagram";
const DEFAULT_EXPLANATION_STYLE: ExplanationStyleOption = "Simple classroom language";
const DEFAULT_OBJECTIVE = "Build a student-friendly explanation that can be directly used in class and for exam preparation.";
const FILE_PROCESSING_TIMEOUT_MS = 30000;
const OCR_TIMEOUT_MS = 30000;
const MAX_OCR_DIMENSION = 1800;
type FileProcessingState = "idle" | "processing" | "success" | "error" | "timeout" | "cancelled";
type OutputSelectionMode = "auto" | "manual";

const BUILD_STAGE_LABELS: Array<{ id: BuildStageId; label: string }> = [
  { id: "ocr", label: "OCR" },
  { id: "question-detection", label: "Question Detection" },
  { id: "subject-detection", label: "Subject Detection" },
  { id: "metadata", label: "Metadata Extraction" },
  { id: "prompt-generation", label: "Prompt Generation" },
];

const UNKNOWN_VALUES = new Set(["Unknown", "Not identified", "Not yet identified", "General"]);

const OUTPUT_OPTION_LABELS: Record<OutputOption, string> = {
  "Normal Solution": "Normal Solution",
  Background: "Background",
  "Formula Breakdown": "Formula Breakdown",
  "Logical Flow": "Logical Flow",
  "Visual Explanation": "Visual Explanation",
  "Dissected Visual": "Dissected Visual",
  "Real-life Analogy": "Real-life Analogy",
  "Exam Importance": "Exam Importance",
  "Common Mistakes": "Common Mistakes",
  "Memory Tricks": "Memory Tricks",
  "Practice Questions": "Practice Questions",
  "Revision Notes": "Revision Notes",
  "Word Meanings": "Word Meanings",
  "Grammar Explanation": "Grammar Explanation",
  Usage: "Usage",
  Examples: "Examples",
  "Common Errors": "Common Errors",
  Timeline: "Timeline",
  "Map Explanation": "Map Explanation",
  "Cause and Effect": "Cause and Effect",
  Flowchart: "Flowchart",
  "Mind Map": "Mind Map",
  Infographic: "Infographic",
  "Create Teaching Image": "Create Teaching Image",
};

const SELECTABLE_OUTPUT_OPTIONS = OUTPUT_OPTIONS.filter((option) => option !== "Normal Solution") as OutputOption[];

const STEM_SUBJECTS = new Set(["Mathematics", "Physics", "Chemistry", "Biology", "Computer", "Commerce"]);
const LANGUAGE_SUBJECTS = new Set(["English", "Hindi", "Marathi"]);
const SOCIAL_SUBJECTS = new Set(["History", "Geography", "Social Science", "Civics", "Economics"]);

const PROFILE_LABELS: Record<StudentProfileOption, string> = {
  "Very weak": "Needs basics first",
  Average: "Average level",
  Advanced: "Advanced learner",
  "Visual learner": "Visual learner",
  "Student finds subject boring": "Needs engaging teaching",
  "Exam preparation": "Exam preparation",
  "Quick revision": "Quick revision",
  "Deep understanding": "Deep understanding",
  "Formula background": "Formula support",
  "Step-by-step explanation": "Step-by-step teaching",
  "Teacher mode": "Teacher-led delivery",
  "Parent mode": "Parent-friendly support",
};

const PROFILE_GROUPS: Array<{ heading: string; icon: typeof GraduationCap; options: StudentProfileOption[] }> = [
  {
    heading: "Learner Profile",
    icon: GraduationCap,
    options: [
      "Very weak",
      "Average",
      "Advanced",
      "Visual learner",
      "Step-by-step explanation",
      "Quick revision",
      "Deep understanding",
      "Exam preparation",
      "Student finds subject boring",
      "Formula background",
    ],
  },
  {
    heading: "Teacher Requirements",
    icon: Presentation,
    options: ["Teacher mode", "Parent mode"],
  },
];

const DEPTH_LABELS: Record<DepthOption, string> = {
  Definition: "Definition",
  Background: "Background context",
  "Real-life analogy": "Real-life analogy",
  "Formula derivation": "Formula derivation",
  "Visual explanation": "Visual explanation",
  "Dissected visual": "Dissected visual",
  "Worked examples": "Worked examples",
  "Common mistakes": "Common mistakes",
  "Revision notes": "Revision notes",
  "Memory tricks": "Memory tricks",
  "Viva questions": "Viva questions",
  "Board questions": "Board exam questions",
  "Practice questions": "Practice questions",
};

const DEPTH_GROUPS: Array<{ heading: string; options: DepthOption[] }> = [
  {
    heading: "Core Understanding",
    options: ["Definition", "Background", "Formula derivation", "Worked examples"],
  },
  {
    heading: "Visual and Explanation Support",
    options: ["Visual explanation", "Dissected visual", "Real-life analogy"],
  },
  {
    heading: "Revision and Assessment",
    options: ["Revision notes", "Memory tricks", "Practice questions", "Board questions", "Viva questions", "Common mistakes"],
  },
];

const SUBJECT_RULES: Array<{ subject: string; keywords: string[] }> = [
  { subject: "Mathematics", keywords: ["algebra", "equation", "triangle", "geometry", "quadratic", "ratio"] },
  { subject: "Physics", keywords: ["force", "motion", "electric", "current", "resistance", "power", "heat"] },
  { subject: "Chemistry", keywords: ["acid", "base", "salt", "atom", "molecule", "reaction", "periodic"] },
  { subject: "Biology", keywords: ["cell", "photosynthesis", "respiration", "organ", "tissue", "dna"] },
  { subject: "History", keywords: ["revolution", "empire", "civilization", "war", "independence"] },
  { subject: "Geography", keywords: ["climate", "soil", "river", "plateau", "monsoon", "map"] },
  { subject: "English", keywords: ["grammar", "tense", "comprehension", "essay", "poem", "letter"] },
];

function normalize(value: string) {
  return value.toLowerCase();
}

function getRelevantOutputOptions(subject: string) {
  const normalized = subject.trim();
  if (!normalized || UNKNOWN_VALUES.has(normalized)) {
    return SELECTABLE_OUTPUT_OPTIONS;
  }

  if (STEM_SUBJECTS.has(normalized)) {
    return SELECTABLE_OUTPUT_OPTIONS.filter((option) =>
      [
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
        "Timeline",
        "Flowchart",
        "Mind Map",
        "Infographic",
        "Create Teaching Image",
      ].includes(option),
    );
  }

  if (LANGUAGE_SUBJECTS.has(normalized)) {
    return SELECTABLE_OUTPUT_OPTIONS.filter((option) =>
      [
        "Background",
        "Logical Flow",
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
        "Mind Map",
        "Infographic",
        "Create Teaching Image",
      ].includes(option),
    );
  }

  if (SOCIAL_SUBJECTS.has(normalized)) {
    return SELECTABLE_OUTPUT_OPTIONS.filter((option) =>
      [
        "Background",
        "Logical Flow",
        "Visual Explanation",
        "Real-life Analogy",
        "Exam Importance",
        "Common Mistakes",
        "Memory Tricks",
        "Practice Questions",
        "Revision Notes",
        "Timeline",
        "Map Explanation",
        "Cause and Effect",
        "Flowchart",
        "Mind Map",
        "Infographic",
        "Create Teaching Image",
      ].includes(option),
    );
  }

  return SELECTABLE_OUTPUT_OPTIONS;
}

function inferSubject(text: string) {
  const lower = normalize(text);
  for (const rule of SUBJECT_RULES) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      return rule.subject;
    }
  }
  return "Not identified";
}

function inferBoard(text: string) {
  const lower = normalize(text);
  if (lower.includes("cbse")) return "CBSE";
  if (lower.includes("icse")) return "ICSE";
  if (lower.includes("igcse")) return "IGCSE";
  if (lower.includes("state board") || lower.includes("ssc")) return "State Board";
  return "Not identified";
}

function inferClassLevel(text: string) {
  const match = text.match(/\b(?:class|grade|std)\s*([6-9]|10|11|12)\b/i);
  if (match?.[1]) return `Class ${match[1]}`;
  return "Not identified";
}

function inferChapter(text: string) {
  const match = text.match(/\bchapter\s*[:\-]?\s*([^\n.]+)/i);
  if (match?.[1]) return match[1].trim();
  return "Not identified";
}

function inferTopic(text: string) {
  const match = text.match(/\btopic\s*[:\-]?\s*([^\n.]+)/i);
  if (match?.[1]) return match[1].trim();

  const line = text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.length > 0 && item.length < 80);
  return line || "Not identified";
}

function inferQuestionType(text: string) {
  const lower = normalize(text);
  if (/\b(mcq|multiple choice|choose the correct option)\b/.test(lower)) return "MCQ";
  if (/\b(assertion|reason)\b/.test(lower)) return "Assertion-Reason";
  if (/\b(prove|derive|show that)\b/.test(lower)) return "Proof / Derivation";
  if (/\b(solve|calculate|find|evaluate)\b/.test(lower)) return "Numerical / Problem Solving";
  if (/\b(explain|describe|discuss|why)\b/.test(lower)) return "Conceptual / Long Answer";
  if (/\b(viva|oral)\b/.test(lower)) return "Viva";
  return "General";
}

function inferQuestionTypes(text: string) {
  const lower = normalize(text);
  const questionTypes: string[] = [];
  if (/\b(mcq|multiple choice|choose the correct option)\b/.test(lower)) questionTypes.push("MCQ");
  if (/\b(solve|calculate|find|evaluate)\b/.test(lower)) questionTypes.push("Numerical / Problem Solving");
  if (/\b(explain|describe|discuss|why)\b/.test(lower)) questionTypes.push("Conceptual / Long Answer");
  if (/\b(diagram|figure|graph|circuit|flowchart|draw|label|sketch)\b/.test(lower)) questionTypes.push("Diagram Required");
  return questionTypes.length > 0 ? questionTypes : ["General"];
}

function inferLanguage(text: string) {
  if (/[\u0900-\u097F]/.test(text)) return "Hindi/Marathi";
  return "English";
}

function inferHasTables(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const pipeLines = lines.filter((line) => line.includes("|")).length;
  return pipeLines > 0;
}

function inferHasExercises(text: string) {
  return /\b(exercise|worksheet|practice set|assignment|homework)\b/i.test(text);
}

function inferExamImportance(text: string) {
  const lower = normalize(text);
  const hasPastPaperCount =
    /(\bpast\s*papers?\b[^\n.]{0,40}\b\d+\s*(times?|x)\b)|(\b\d+\s*(times?|x)\b[^\n.]{0,40}\bpast\s*papers?\b)/i.test(lower);
  if (hasPastPaperCount) {
    return "Past-paper frequency referenced in source text.";
  }
  return "Past-paper frequency unavailable.";
}

function extractFormulae(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const matches = lines.filter((line) =>
    /([A-Za-z][A-Za-z0-9_]*\s*=\s*[^=].*|[0-9A-Za-z]+\s*[+\-*/^]\s*[0-9A-Za-z]+|\bV\s*=\s*I\s*R\b|\bP\s*=\s*V\s*I\b|\bH\s*=\s*I\s*\^?2\s*R\s*t\b)/i.test(line),
  );
  return Array.from(new Set(matches)).slice(0, 12);
}

function extractNumericalQuestions(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const matches = lines.filter((line) =>
    /\d/.test(line) && /\b(find|calculate|solve|evaluate|determine|what is|compute)\b/i.test(line),
  );
  return Array.from(new Set(matches)).slice(0, 12);
}

function extractDiagrams(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const matches = lines.filter((line) =>
    /\b(diagram|figure|graph|circuit|flowchart|draw|label|sketch)\b/i.test(line),
  );
  return Array.from(new Set(matches)).slice(0, 10);
}

function extractKeywords(text: string) {
  const stopWords = new Set([
    "the", "and", "for", "with", "that", "this", "from", "into", "your", "their", "there",
    "class", "chapter", "topic", "question", "board", "what", "when", "where", "which", "why",
    "find", "solve", "state", "write", "show", "explain", "derive", "calculate", "of", "in", "to",
  ]);

  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));

  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([token]) => token);
}

function inferExtractedContent(text: string): ExtractedContent {
  return {
    ocrText: text,
    subject: inferSubject(text),
    board: inferBoard(text),
    classLevel: inferClassLevel(text),
    chapter: inferChapter(text),
    topic: inferTopic(text),
    questionType: inferQuestionType(text),
    questionTypes: inferQuestionTypes(text),
    language: inferLanguage(text),
    hasTables: inferHasTables(text),
    hasExercises: inferHasExercises(text),
    examImportance: inferExamImportance(text),
    formulae: extractFormulae(text),
    numericalQuestions: extractNumericalQuestions(text),
    diagrams: extractDiagrams(text),
    keywords: extractKeywords(text),
  };
}

function getFileTag(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "PDF";
  if (lower.match(/\.(png|jpg|jpeg|webp|gif)$/)) return "Image";
  if (lower.includes("question") || lower.includes("paper")) return "Question paper";
  if (lower.includes("textbook")) return "Textbook page";
  return "File";
}

function withTimeout<T>(task: () => Promise<T>, timeoutMs: number, timeoutMessage: string, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new DOMException("Processing was cancelled.", "AbortError"));
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    signal?.addEventListener("abort", onAbort, { once: true });

    void task()
      .then((result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        resolve(result);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(error);
      });
  });
}

async function preprocessImageForOcr(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  const sizeLimit = 1.5 * 1024 * 1024;
  if (file.size <= sizeLimit) return file;

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to decode image."));
      img.src = objectUrl;
    });

    const scale = Math.min(1, MAX_OCR_DIMENSION / Math.max(image.width, image.height));
    if (scale >= 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84));
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function readTextFromFile(file: File, signal?: AbortSignal): Promise<string> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return extractTextFromPdf(file, signal);
  }

  if (file.type.startsWith("image/")) {
    return extractTextFromImage(file, signal);
  }

  const name = file.name.toLowerCase();
  const isTextFile =
    file.type.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".csv") ||
    name.endsWith(".json");

  if (!isTextFile) return "";
  return file.text();
}

async function extractTextFromPdf(file: File, signal?: AbortSignal): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdfWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker.default;

    const buffer = await withTimeout(() => file.arrayBuffer(), FILE_PROCESSING_TIMEOUT_MS, "PDF processing took too long. Please try again or upload a clearer/smaller image.", signal);
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdf = await withTimeout(() => loadingTask.promise, FILE_PROCESSING_TIMEOUT_MS, "PDF processing took too long. Please try again or upload a clearer/smaller image.", signal);
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      if (signal?.aborted) throw new DOMException("Processing was cancelled.", "AbortError");
      const page = await withTimeout(() => pdf.getPage(pageNum), FILE_PROCESSING_TIMEOUT_MS, "PDF page extraction timed out.", signal);
      const content = await withTimeout(() => page.getTextContent(), FILE_PROCESSING_TIMEOUT_MS, "PDF text extraction timed out.", signal);
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      pageTexts.push(text);
    }

    return pageTexts.join("\n");
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw error;
    }
    return "";
  }
}

async function extractTextFromImage(file: File, signal?: AbortSignal): Promise<string> {
  try {
    const optimizedFile = await preprocessImageForOcr(file);

    const Detector = (window as unknown as { TextDetector?: new () => { detect: (source: ImageBitmap) => Promise<Array<{ rawValue?: string }>> } }).TextDetector;
    if (Detector) {
      const bitmap = await withTimeout(() => createImageBitmap(optimizedFile), FILE_PROCESSING_TIMEOUT_MS, "Image preprocessing timed out.", signal);
      const detector = new Detector();
      const blocks = await withTimeout(() => detector.detect(bitmap), FILE_PROCESSING_TIMEOUT_MS, "Image OCR timed out.", signal);
      const detectedText = blocks
        .map((block) => block.rawValue?.trim() ?? "")
        .filter(Boolean)
        .join("\n");

      if (detectedText) return detectedText;
    }

    return extractTextWithTesseract(optimizedFile, signal);
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw error;
    }

    try {
      return await extractTextWithTesseract(file, signal);
    } catch {
      throw new Error("OCR could not be completed. Text extraction unavailable — you can paste or edit the source text manually.");
    }
  }
}

async function extractTextWithTesseract(file: File, signal?: AbortSignal): Promise<string> {
  let worker: Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | undefined;

  try {
    const tesseract = await import("tesseract.js");
    worker = await withTimeout(
      () =>
        tesseract.createWorker("eng", 1, {
          workerPath: "/tesseract-worker/worker.min.js",
          corePath: "/tesseract-core",
          langPath: "/tessdata",
          gzip: true,
          workerBlobURL: false,
        }),
      OCR_TIMEOUT_MS,
      "OCR processing is taking too long.",
      signal,
    );

    if (!worker) {
      throw new Error("OCR worker could not initialize.");
    }

    const initializedWorker = worker;
    const result = await withTimeout(
      () => initializedWorker.recognize(file),
      FILE_PROCESSING_TIMEOUT_MS,
      "OCR processing is taking too long.",
      signal,
    );
    return result.data.text.trim();
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw error;
    }
    throw new Error("OCR processing is taking too long.");
  } finally {
    if (worker) {
      await worker.terminate().catch(() => undefined);
    }
  }
}

function parseListInput(value: string) {
  return value
    .split(/\r?\n|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatListInput(values: string[]) {
  return values.join("\n");
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isMeaningfulExtracted(item: ExtractedContent) {
  return (
    !UNKNOWN_VALUES.has(item.subject) ||
    !UNKNOWN_VALUES.has(item.topic) ||
    !UNKNOWN_VALUES.has(item.chapter) ||
    !UNKNOWN_VALUES.has(item.questionType) ||
    item.formulae.length > 0 ||
    item.numericalQuestions.length > 0 ||
    item.diagrams.length > 0
  );
}

function getActionableExtractedItems(items: ExtractedContent[]) {
  return items.filter(isMeaningfulExtracted);
}

function getSourceExtractionContext(params: {
  sourceFiles: string[];
  ocrText: string;
  extracted: ExtractedContent;
  processingState: FileProcessingState;
  intakeError: string | null;
}): SourceExtractionContext {
  const { sourceFiles, ocrText, extracted, processingState, intakeError } = params;
  const hasFiles = sourceFiles.length > 0;
  const hasText = ocrText.trim().length > 0;
  const metadataSignals = [
    extracted.subject,
    extracted.classLevel,
    extracted.board,
    extracted.chapter,
    extracted.topic,
  ].filter((value) => !UNKNOWN_VALUES.has(value)).length;

  if (!hasFiles) {
    return {
      sourceFiles,
      extractedText: ocrText,
      extractionStage: "pending",
      confidenceLabel: "Low",
      confidenceNote: "Upload source material to start OCR/source extraction.",
      metadata: {
        subject: extracted.subject,
        classLevel: extracted.classLevel,
        board: extracted.board,
        chapter: extracted.chapter,
        topic: extracted.topic,
        questionType: extracted.questionType,
        language: extracted.language,
        formulaCount: extracted.formulae.length,
        diagramCount: extracted.diagrams.length,
      },
    };
  }

  if ((processingState === "error" || processingState === "timeout") && !hasText) {
    return {
      sourceFiles,
      extractedText: ocrText,
      extractionStage: "unavailable",
      confidenceLabel: "Low",
      confidenceNote: intakeError ?? "OCR/source extraction failed. Verify source quality and edit text manually.",
      metadata: {
        subject: extracted.subject,
        classLevel: extracted.classLevel,
        board: extracted.board,
        chapter: extracted.chapter,
        topic: extracted.topic,
        questionType: extracted.questionType,
        language: extracted.language,
        formulaCount: extracted.formulae.length,
        diagramCount: extracted.diagrams.length,
      },
    };
  }

  const hasGoodTextLength = ocrText.trim().length >= 180;
  const hasSignals = metadataSignals >= 2 || extracted.formulae.length > 0 || extracted.diagrams.length > 0;

  if (hasText && hasGoodTextLength && hasSignals) {
    return {
      sourceFiles,
      extractedText: ocrText,
      extractionStage: "ready",
      confidenceLabel: "High",
      confidenceNote: "OCR/source extraction looks good. Proceed to AI learning response.",
      metadata: {
        subject: extracted.subject,
        classLevel: extracted.classLevel,
        board: extracted.board,
        chapter: extracted.chapter,
        topic: extracted.topic,
        questionType: extracted.questionType,
        language: extracted.language,
        formulaCount: extracted.formulae.length,
        diagramCount: extracted.diagrams.length,
      },
    };
  }

  if (hasText) {
    return {
      sourceFiles,
      extractedText: ocrText,
      extractionStage: "needs-review",
      confidenceLabel: "Medium",
      confidenceNote: "OCR confidence may be low. Please verify and edit extracted text before continuing.",
      metadata: {
        subject: extracted.subject,
        classLevel: extracted.classLevel,
        board: extracted.board,
        chapter: extracted.chapter,
        topic: extracted.topic,
        questionType: extracted.questionType,
        language: extracted.language,
        formulaCount: extracted.formulae.length,
        diagramCount: extracted.diagrams.length,
      },
    };
  }

  return {
    sourceFiles,
    extractedText: ocrText,
    extractionStage: "pending",
    confidenceLabel: "Low",
    confidenceNote: "Waiting for extracted text from source material.",
    metadata: {
      subject: extracted.subject,
      classLevel: extracted.classLevel,
      board: extracted.board,
      chapter: extracted.chapter,
      topic: extracted.topic,
      questionType: extracted.questionType,
      language: extracted.language,
      formulaCount: extracted.formulae.length,
      diagramCount: extracted.diagrams.length,
    },
  };
}

function RouteComponent() {
  const { entry } = Route.useSearch();
  const [files, setFiles] = useState<File[]>([]);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [ocrText, setOcrText] = useLocalStorage(STORAGE_KEYS.teachingEngineOcrText, "");
  const [extracted, setExtracted] = useLocalStorage<ExtractedContent>(STORAGE_KEYS.teachingEngineExtracted, DEFAULT_EXTRACTED);
  const [extractedItems, setExtractedItems] = useLocalStorage<ExtractedContent[]>(
    STORAGE_KEYS.teachingEngineExtractedItems,
    [],
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [processingState, setProcessingState] = useState<FileProcessingState>("idle");
  const [processingMessage, setProcessingMessage] = useState("Ready to process files.");
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useLocalStorage<StudentProfileOption[]>(
    STORAGE_KEYS.teachingEngineStudentProfile,
    DEFAULT_STUDENT_PROFILE,
  );
  const [depthOptions, setDepthOptions] = useLocalStorage<DepthOption[]>(
    STORAGE_KEYS.teachingEngineDepthOptions,
    DEFAULT_DEPTH_OPTIONS,
  );
  const [selectedOutputOptions, setSelectedOutputOptions] = useLocalStorage<OutputOption[]>(
    STORAGE_KEYS.teachingEngineOutputOptions,
    DEFAULT_OUTPUT_OPTIONS,
  );
  const [outputSelectionMode, setOutputSelectionMode] = useLocalStorage<OutputSelectionMode>(
    STORAGE_KEYS.teachingEngineOutputSelectionMode,
    "auto",
  );
  const [quickNumberInput, setQuickNumberInput] = useState("");
  const [visualStyle, setVisualStyle] = useLocalStorage<VisualStyleOption>(
    STORAGE_KEYS.teachingEngineVisualStyle,
    DEFAULT_VISUAL_STYLE,
  );
  const [explanationStyle, setExplanationStyle] = useLocalStorage<ExplanationStyleOption>(
    STORAGE_KEYS.teachingEngineExplanationStyle,
    DEFAULT_EXPLANATION_STYLE,
  );
  const [objective, setObjective] = useLocalStorage(STORAGE_KEYS.teachingEngineObjective, DEFAULT_OBJECTIVE);
  const [prompt, setPrompt] = useLocalStorage(STORAGE_KEYS.teachingEnginePrompt, "");
  const [workflowStep, setWorkflowStep] = useLocalStorage<WorkflowStep>(
    STORAGE_KEYS.teachingEngineWorkflowStep,
    "upload",
  );
  const [copied, setCopied] = useState(false);
  const [isBuildingPrompt, setIsBuildingPrompt] = useState(false);
  const [buildStatus, setBuildStatus] = useState<string | null>(null);
  const [buildStages, setBuildStages] = useState<BuildStage[]>([]);
  const [buildSuccess, setBuildSuccess] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [emptyDetectionWarning, setEmptyDetectionWarning] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "opened" | "error">("idle");
  const [announcement, setAnnouncement] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadAnotherInputRef = useRef<HTMLInputElement>(null);
  const autoOpenedEntryRef = useRef<string | null>(null);
  const activeProcessingRef = useRef<{ id: number; controller: AbortController } | null>(null);

  const sourceFiles = useMemo(
    () => files.map((file) => `${getFileTag(file.name)}: ${file.name}`),
    [files],
  );

  const ocrLineCount = ocrText
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0).length;

  const activeExtractedItems = useMemo(() => {
    if (extractedItems.length > 0) {
      return extractedItems;
    }
    return extracted.ocrText || extracted.subject !== "Not identified" ? [extracted] : [];
  }, [extracted, extractedItems]);

  const actionableExtractedItems = useMemo(
    () => getActionableExtractedItems(activeExtractedItems),
    [activeExtractedItems],
  );

  const detectedSubject = actionableExtractedItems[0]?.subject ?? extracted.subject;
  const relevantOutputOptions = useMemo(
    () => getRelevantOutputOptions(detectedSubject),
    [detectedSubject],
  );
  const numberedRelevantOutputOptions = useMemo(
    () => relevantOutputOptions.map((option, index) => ({
      index: index + 1,
      option,
      label: `${String(index + 1).padStart(2, "0")} ${OUTPUT_OPTION_LABELS[option]}`,
    })),
    [relevantOutputOptions],
  );

  const promptSummary = useMemo(() => {
    const items = actionableExtractedItems;
    if (items.length === 0) return null;

    const uniqueSubjects = Array.from(new Set(items.map((item) => item.subject).filter((value) => !UNKNOWN_VALUES.has(value))));
    const readingMinutes = Math.max(3, Math.min(12, Math.round(items.length * 1.4 + selectedOutputOptions.length * 0.2)));
    const readingRange = `${Math.max(2, readingMinutes - 1)}-${readingMinutes + 1} minutes`;

    return {
      imagesProcessed: files.length,
      academicQuestions: items.length,
      subjects: uniqueSubjects,
      teachingStyle: explanationStyle,
      visualStyle,
      learnerProfile: studentProfile.length > 0 ? studentProfile.join(", ") : "Auto / Not specified",
      estimatedOutput: selectedOutputOptions,
      estimatedReadingTime: readingRange,
    };
  }, [actionableExtractedItems, explanationStyle, files.length, selectedOutputOptions, studentProfile, visualStyle]);

  const hasAcademicContent = useMemo(
    () => actionableExtractedItems.length > 0,
    [actionableExtractedItems],
  );

  const sourceExtractionContext = useMemo(
    () =>
      getSourceExtractionContext({
        sourceFiles,
        ocrText,
        extracted,
        processingState,
        intakeError,
      }),
    [sourceFiles, ocrText, extracted, processingState, intakeError],
  );

  useEffect(() => {
    if (!entry || autoOpenedEntryRef.current === entry) return;

    const targetRef = entry === "camera" ? cameraInputRef : fileInputRef;
    const input = targetRef.current;
    if (!input) return;

    autoOpenedEntryRef.current = entry;
    input.click();
  }, [entry]);

  useEffect(() => {
    let active = true;

    void loadTeachingEngineFiles().then((restoredFiles) => {
      if (!active) return;
      setFiles(restoredFiles);
      setFilesLoaded(true);
    });

    return () => {
      active = false;
      cancelActiveProcessing();
    };
  }, []);

  useEffect(() => {
    if (!filesLoaded) return;
    void saveTeachingEngineFiles(files);
  }, [files, filesLoaded]);

  useEffect(() => {
    setExtracted((prev) => ({
      ...DEFAULT_EXTRACTED,
      ...prev,
      concept: prev.concept ?? "Not identified",
      questionTypes: prev.questionTypes ?? [],
      formulae: prev.formulae ?? [],
      formulaDetails: prev.formulaDetails ?? [],
      numericalQuestions: prev.numericalQuestions ?? [],
      diagrams: prev.diagrams ?? [],
      keywords: prev.keywords ?? [],
      language: prev.language ?? "Not identified",
      examImportance: prev.examImportance ?? "Not identified",
      hasTables: prev.hasTables ?? false,
      hasExercises: prev.hasExercises ?? false,
    }));

    setExtractedItems((prev) =>
      prev.map((item) => ({
        ...DEFAULT_EXTRACTED,
        ...item,
        concept: item.concept ?? "Not identified",
        questionTypes: item.questionTypes ?? [],
        formulae: item.formulae ?? [],
        formulaDetails: item.formulaDetails ?? [],
        numericalQuestions: item.numericalQuestions ?? [],
        diagrams: item.diagrams ?? [],
        keywords: item.keywords ?? [],
        language: item.language ?? "Not identified",
        examImportance: item.examImportance ?? "Not identified",
        hasTables: item.hasTables ?? false,
        hasExercises: item.hasExercises ?? false,
      })),
    );
  }, [setExtracted, setExtractedItems]);

  useEffect(() => {
    setSelectedOutputOptions((prev) => {
      const safeSet = new Set<OutputOption>(["Normal Solution", ...prev.filter((item): item is OutputOption => OUTPUT_OPTIONS.includes(item as OutputOption))]);
      return Array.from(safeSet);
    });
  }, [setSelectedOutputOptions]);

  useEffect(() => {
    if (outputSelectionMode !== "auto") return;

    const nextAutoSelection = getAutoRelevantOutputOptions({
      extracted,
      studentProfile,
      objective,
    });

    setSelectedOutputOptions((prev) => {
      const normalizedPrev = [...new Set(prev)];
      if (
        normalizedPrev.length === nextAutoSelection.length
        && normalizedPrev.every((item, index) => item === nextAutoSelection[index])
      ) {
        return prev;
      }
      return nextAutoSelection;
    });
  }, [extracted, objective, outputSelectionMode, setSelectedOutputOptions, studentProfile]);

  function toggleProfile(option: StudentProfileOption) {
    setWorkflowStep("profile");
    setOutputSelectionMode("manual");
    setStudentProfile((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option],
    );
  }

  function toggleDepth(option: DepthOption) {
    setWorkflowStep("depth");
    setDepthOptions((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option],
    );
  }

  function toggleOutputOption(option: OutputOption) {
    if (option === "Normal Solution") return;
    setWorkflowStep("generate");
    setOutputSelectionMode("manual");
    setSelectedOutputOptions((prev) => {
      const next = prev.filter((item) => item !== "Normal Solution");
      return prev.includes(option)
        ? ["Normal Solution", ...next.filter((item) => item !== option)]
        : ["Normal Solution", ...next, option];
    });
  }

  function applyQuickNumberSelection(rawInput: string) {
    const selectedNumbers = new Set<number>();

    rawInput
      .split(",")
      .flatMap((segment) => segment.split(/\s+/))
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => {
        const number = Number.parseInt(value, 10);
        if (Number.isInteger(number) && number >= 1 && number <= relevantOutputOptions.length) {
          selectedNumbers.add(number);
        }
      });

    const nextSelection = new Set<OutputOption>(["Normal Solution"]);
    Array.from(selectedNumbers)
      .sort((a, b) => a - b)
      .forEach((number) => {
        const option = relevantOutputOptions[number - 1];
        if (option) nextSelection.add(option);
      });

    setOutputSelectionMode("manual");
    setSelectedOutputOptions(Array.from(nextSelection));
    setQuickNumberInput("");
  }

  function selectAllOutputOptions() {
    setWorkflowStep("generate");
    setOutputSelectionMode("manual");
    setSelectedOutputOptions(["Normal Solution", ...relevantOutputOptions]);
  }

  function clearOutputOptions() {
    setWorkflowStep("generate");
    setOutputSelectionMode("manual");
    setSelectedOutputOptions(["Normal Solution"]);
  }

  function cancelActiveProcessing() {
    const active = activeProcessingRef.current;
    if (active) {
      active.controller.abort();
      activeProcessingRef.current = null;
    }
  }

  async function processFiles(selected: File[], append: boolean) {
    const previous = activeProcessingRef.current;
    if (previous) {
      previous.controller.abort();
    }

    const currentController = new AbortController();
    const processingId = Date.now() + Math.random();
    activeProcessingRef.current = { id: processingId, controller: currentController };

    const combined = append ? [...files, ...selected] : selected;
    setFiles(combined);
    setIsExtracting(true);
    setProcessingState("processing");
    setProcessingMessage(
      combined.some((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
        ? "Processing PDF..."
        : "Processing image...",
    );
    setIntakeError(null);

    try {
      const extractedTextParts: string[] = [];
      for (const file of combined) {
        if (currentController.signal.aborted) {
          throw new DOMException("Processing was cancelled.", "AbortError");
        }

        setProcessingMessage(
          file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
            ? `Processing PDF: ${file.name}`
            : `Processing image: ${file.name}`,
        );

        const text = await readTextFromFile(file, currentController.signal);
        if (text.trim()) {
          extractedTextParts.push(text.trim());
        }
      }

      if (currentController.signal.aborted) {
        throw new DOMException("Processing was cancelled.", "AbortError");
      }

      const mergedText = extractedTextParts.join("\n\n").trim();
      if (mergedText) {
        setOcrText(mergedText);
        const nextItems = extractAcademicQuestions(mergedText);
        const actionableItems = getActionableExtractedItems(nextItems);
        if (actionableItems.length > 0) {
          setExtractedItems(nextItems);
          setExtracted(actionableItems[0]);
          setWorkflowStep("ocr");
        } else {
          setExtractedItems(nextItems);
          setExtracted(DEFAULT_EXTRACTED);
        }
        setProcessingState("success");
        setProcessingMessage("✓ Processing complete");
      } else {
        setProcessingState("error");
        setProcessingMessage("⚠ Processing failed");
        setIntakeError("Text extraction unavailable — you can paste or edit the source text manually.");
      }
    } catch (error) {
      if (currentController.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        setProcessingState("cancelled");
        setProcessingMessage("Processing cancelled");
        return;
      }

      const message = error instanceof Error ? error.message : "File processing failed.";
      if (message.includes("too long") || message.includes("timed out") || message.includes("taking too long")) {
        setProcessingState("timeout");
        setProcessingMessage("OCR processing is taking too long.");
        setIntakeError("OCR processing is taking too long. Retry OCR or use manual text.");
      } else {
        setProcessingState("error");
        setProcessingMessage("⚠ Processing failed");
        setIntakeError(message || "OCR could not be completed. Text extraction unavailable — you can paste or edit the source text manually.");
      }
    } finally {
      if (activeProcessingRef.current?.id === processingId) {
        activeProcessingRef.current = null;
      }
      setIsExtracting(false);
    }
  }

  function clearAll() {
    cancelActiveProcessing();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (uploadAnotherInputRef.current) uploadAnotherInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    setFiles([]);
    void clearTeachingEngineFiles();
    setOcrText("");
    setExtracted(DEFAULT_EXTRACTED);
    setExtractedItems([]);
    setPrompt("");
    setCopied(false);
    setProcessingState("idle");
    setIntakeError(null);
    setBuildStatus(null);
    setBuildStages([]);
    setBuildSuccess(null);
    setBuildError(null);
    setEmptyDetectionWarning(false);
    setSendStatus("idle");
    setAnnouncement("");
    setWorkflowStep("upload");
    setStudentProfile(DEFAULT_STUDENT_PROFILE);
    setDepthOptions(DEFAULT_DEPTH_OPTIONS);
    setOutputSelectionMode("auto");
    setSelectedOutputOptions(DEFAULT_OUTPUT_OPTIONS);
    setVisualStyle(DEFAULT_VISUAL_STYLE);
    setExplanationStyle(DEFAULT_EXPLANATION_STYLE);
    setObjective(DEFAULT_OBJECTIVE);
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>, append = false) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;
    await processFiles(selected, append);
    event.target.value = "";
  }

  function runExtraction() {
    setWorkflowStep("ocr");
    const nextItems = extractAcademicQuestions(ocrText);
    const actionableItems = getActionableExtractedItems(nextItems);
    if (actionableItems.length > 0) {
      setExtractedItems(nextItems);
      setExtracted(actionableItems[0]);
    } else {
      setExtractedItems(nextItems);
      setExtracted(DEFAULT_EXTRACTED);
    }
    setCopied(false);
    setBuildSuccess(null);
    setBuildError(null);
    setEmptyDetectionWarning(false);
    setAnnouncement("Metadata extraction completed.");
    setWorkflowStep("ocr");
  }

  async function buildPrompt() {
    setIsBuildingPrompt(true);
    setBuildStatus("Analyzing classroom content...");
    setBuildSuccess(null);
    setBuildError(null);
    setEmptyDetectionWarning(false);
    setSendStatus("idle");
    setAnnouncement("Building teaching prompt started.");
    setWorkflowStep("generate");

    const initialStages = BUILD_STAGE_LABELS.map((stage, index) => ({
      ...stage,
      status: index === 0 ? "in-progress" : "pending",
    })) as BuildStage[];
    setBuildStages(initialStages);

    if (!hasAcademicContent) {
      setPrompt("");
      setIsBuildingPrompt(false);
      setBuildStatus(null);
      setBuildStages([]);
      setEmptyDetectionWarning(true);
      setAnnouncement("No academic questions found.");
      return;
    }

    try {
      for (let stageIndex = 0; stageIndex < BUILD_STAGE_LABELS.length; stageIndex += 1) {
        const stage = BUILD_STAGE_LABELS[stageIndex];

        setBuildStages((prev) =>
          prev.map((item, itemIndex) => {
            if (itemIndex < stageIndex) return { ...item, status: "completed" };
            if (itemIndex === stageIndex) return { ...item, status: "in-progress" };
            return { ...item, status: "pending" };
          }),
        );

        setBuildStatus(stage.id === "prompt-generation" ? "Building teaching prompt..." : `Running ${stage.label.toLowerCase()}...`);
        setAnnouncement(`${stage.label} in progress.`);
        await delay(360);
      }

      const nextExtractedItems = actionableExtractedItems.length > 0
        ? [{
            ...actionableExtractedItems[0],
            ...extracted,
            ocrText,
          }, ...actionableExtractedItems.slice(1)]
        : [{
            ...extracted,
            ocrText,
          }];

      const nextPrompts = buildPromptTexts({
        sourceFiles,
        extracted: {
          ...extracted,
          ocrText,
        },
        extractedItems: nextExtractedItems,
        studentProfile,
        depthOptions,
        selectedOutputOptions,
        visualStyle,
        explanationStyle,
        objective,
      });

      const nextPrompt = nextPrompts.length <= 1
        ? (nextPrompts[0] ?? "")
        : nextPrompts.map((item, index) => `QUESTION ${index + 1} PROMPT\n${item}`).join("\n\n");

      setPrompt(nextPrompt);
      setBuildStages(BUILD_STAGE_LABELS.map((stage) => ({ ...stage, status: "completed" })));
      setBuildStatus(null);
      setBuildSuccess(`Prompt Built Successfully. Detected ${nextExtractedItems.length} academic questions. Ready to send to ChatGPT.`);
      setAnnouncement("Prompt built successfully.");
      setWorkflowStep("preview");
      setCopied(false);
    } catch {
      setBuildStatus(null);
      setBuildError("Unable to build prompt. Reason: OCR extraction failed.");
      setBuildStages([]);
      setAnnouncement("Unable to build prompt.");
    } finally {
      setIsBuildingPrompt(false);
    }
  }

  async function sendToChatGpt() {
    if (!prompt.trim()) return;
    setSendStatus("sending");
    setAnnouncement("Sending prompt to ChatGPT.");
    setWorkflowStep("preview");
    await delay(520);

    try {
      const url = `https://chatgpt.com/?prompt=${encodeURIComponent(prompt)}`;
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (opened) {
        setSendStatus("opened");
        setAnnouncement("Opened ChatGPT with generated prompt.");
      } else {
        setSendStatus("sent");
        setAnnouncement("Prompt sent successfully.");
      }
    } catch {
      setSendStatus("error");
      setAnnouncement("Unable to open ChatGPT tab.");
    }
  }

  function chooseImagesAgain() {
    fileInputRef.current?.click();
  }

  function reportIssue() {
    window.open("mailto:support@teachersdepth.app?subject=Prompt%20Builder%20Issue", "_blank", "noopener,noreferrer");
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setAnnouncement("Prompt copied to clipboard.");
    } catch {
      setCopied(false);
    }
  }

  return (
    <AppShell back={{ to: "/" }} title="Prompt Builder Engine">
      <div className="space-y-4">
        <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-elegant)] backdrop-blur md:p-5">
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <Upload size={14} />
            <span>1. Upload Source Content</span>
          </div>

          <div className="rounded-2xl border border-dashed border-border bg-background/50 px-4 py-5">
            <div className="mb-3 text-sm font-semibold text-foreground">Attach PDF, screenshot, image, question paper or textbook page</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Upload size={16} />
                Upload Screenshot/PDF
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground"
              >
                <Camera size={16} />
                Camera Photo
              </button>
              <button
                type="button"
                onClick={() => uploadAnotherInputRef.current?.click()}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground"
              >
                <Upload size={16} />
                Upload Another
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground"
              >
                Clear
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                void onFileChange(event, false);
              }}
            />
            <input
              ref={uploadAnotherInputRef}
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                void onFileChange(event, true);
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                void onFileChange(event, true);
              }}
            />
            <div className="mt-2 text-xs text-muted-foreground">No external AI calls. OCR and extraction run locally where possible.</div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/50 p-3">
              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Attached files</div>
              {sourceFiles.length > 0 ? (
                <ul className="space-y-1 text-sm text-foreground">
                  {sourceFiles.map((item) => (
                    <li key={item} className="break-all">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No files attached yet.</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-background/50 p-3">
              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Extracted OCR text (verify/edit)</div>
              <textarea
                value={ocrText}
                onChange={(event) => {
                  setWorkflowStep("ocr");
                  setOcrText(event.target.value);
                }}
                placeholder="Paste OCR text from your uploaded page here."
                className="min-h-28 w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none"
              />
              <div className="mt-2 text-[11px] text-muted-foreground">{ocrText.length} chars • {ocrLineCount} lines</div>
            </div>
          </div>

          {isExtracting && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              {processingMessage}
            </div>
          )}

          {processingState === "success" && !isExtracting && (
            <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              ✓ Processing complete. OCR extraction completed successfully.
            </div>
          )}

          {processingState === "timeout" && !isExtracting && (
            <div className="mt-3 space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <div>OCR processing is taking too long.</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProcessingState("idle");
                    setIntakeError(null);
                    fileInputRef.current?.click();
                  }}
                  className="rounded-xl border border-border bg-card/70 px-3 py-2 text-xs font-semibold text-foreground"
                >
                  Retry OCR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProcessingState("idle");
                    setIntakeError("Text extraction unavailable — you can paste or edit the source text manually.");
                  }}
                  className="rounded-xl border border-border bg-card/70 px-3 py-2 text-xs font-semibold text-foreground"
                >
                  Use Manual Text
                </button>
              </div>
            </div>
          )}

          {processingState === "cancelled" && !isExtracting && (
            <div className="mt-3 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
              Previous processing was cancelled because a newer file replaced it.
            </div>
          )}

          {intakeError && (
            <div className="mt-3 space-y-2">
              <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {intakeError}
              </p>
              {(processingState === "timeout" || processingState === "error" || processingState === "cancelled") && (
                <button
                  type="button"
                  onClick={() => {
                    setProcessingState("idle");
                    setIntakeError(null);
                    fileInputRef.current?.click();
                  }}
                  className="rounded-xl border border-border bg-card/70 px-3 py-2 text-xs font-semibold text-foreground"
                >
                  TRY AGAIN
                </button>
              )}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-elegant)] backdrop-blur md:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <FileText size={14} />
              <span>2. Extract Metadata</span>
            </div>
            <button
              type="button"
              onClick={runExtraction}
              className="min-h-9 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-foreground"
            >
              Extract Locally
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ExtractField label="Subject" value={extracted.subject} onChange={(value) => setExtracted((prev) => ({ ...prev, subject: value }))} />
            <ExtractField label="Board" value={extracted.board} onChange={(value) => setExtracted((prev) => ({ ...prev, board: value }))} />
            <ExtractField label="Class" value={extracted.classLevel} onChange={(value) => setExtracted((prev) => ({ ...prev, classLevel: value }))} />
            <ExtractField label="Chapter" value={extracted.chapter} onChange={(value) => setExtracted((prev) => ({ ...prev, chapter: value }))} />
            <ExtractField label="Topic" value={extracted.topic} onChange={(value) => setExtracted((prev) => ({ ...prev, topic: value }))} />
            <ExtractField label="Question type" value={extracted.questionType} onChange={(value) => setExtracted((prev) => ({ ...prev, questionType: value }))} />
            <ExtractField label="Language" value={extracted.language} onChange={(value) => setExtracted((prev) => ({ ...prev, language: value }))} />
            <ExtractField label="Exam importance" value={extracted.examImportance} onChange={(value) => setExtracted((prev) => ({ ...prev, examImportance: value }))} />
            <ExtractField
              label="Contains tables"
              value={extracted.hasTables ? "Yes" : "No"}
              onChange={(value) => setExtracted((prev) => ({ ...prev, hasTables: /^y(es)?$/i.test(value.trim()) }))}
            />
            <ExtractField
              label="Contains exercises"
              value={extracted.hasExercises ? "Yes" : "No"}
              onChange={(value) => setExtracted((prev) => ({ ...prev, hasExercises: /^y(es)?$/i.test(value.trim()) }))}
            />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <ExtractListField
              label="Question types"
              values={extracted.questionTypes}
              onChange={(values) => setExtracted((prev) => ({ ...prev, questionTypes: values }))}
            />
            <ExtractListField
              label="Formulae"
              values={extracted.formulae}
              onChange={(values) => setExtracted((prev) => ({ ...prev, formulae: values }))}
            />
            <ExtractListField
              label="Numerical questions"
              values={extracted.numericalQuestions}
              onChange={(values) => setExtracted((prev) => ({ ...prev, numericalQuestions: values }))}
            />
            <ExtractListField
              label="Diagrams"
              values={extracted.diagrams}
              onChange={(values) => setExtracted((prev) => ({ ...prev, diagrams: values }))}
            />
            <ExtractListField
              label="Keywords"
              values={extracted.keywords}
              onChange={(values) => setExtracted((prev) => ({ ...prev, keywords: values }))}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-elegant)] backdrop-blur md:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles size={14} />
              <span>3. Output Options</span>
            </div>
            <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              Subject-aware options
            </span>
          </div>

          <div className="mb-3 rounded-2xl border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
            Detected subject: {detectedSubject || "Not identified"}. Showing relevant options only.
          </div>

          <div className="mb-3 rounded-2xl border border-border bg-background/60 p-3">
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Primary Output</div>
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary bg-primary text-xs font-bold text-primary-foreground">
                01
              </span>
              <span className="text-sm font-semibold text-foreground">Normal Solution</span>
            </div>
          </div>

          <form
            className="mb-3 rounded-2xl border border-border bg-background/60 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              applyQuickNumberSelection(quickNumberInput);
            }}
          >
            <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Enter option numbers
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={quickNumberInput}
                onChange={(event) => setQuickNumberInput(event.target.value)}
                placeholder="Example: 1,5,8,10"
                inputMode="numeric"
                autoComplete="off"
                aria-label="Enter option numbers"
                className="w-full rounded-xl border border-border bg-card/70 px-3 py-3 text-sm text-foreground outline-none"
              />
              <button
                type="submit"
                className="rounded-xl border border-border bg-background/70 px-4 py-3 text-sm font-semibold text-foreground"
              >
                Select
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-border bg-background/45 p-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>Deep learning functions</span>
              <span>
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary bg-primary text-xs font-bold text-primary-foreground"
              </span>
            </div>
            <div className="pr-1">
              <div className="space-y-2">
                {numberedRelevantOutputOptions.map(({ index, option, label }) => {
                  const selected = selectedOutputOptions.includes(option);

                  return (
                    <button
                      key={option}
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      aria-label={label}
                      onClick={() => toggleOutputOption(option)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                        selected
                          ? "border-primary/60 bg-primary/10 text-foreground"
                          : "border-border bg-card/50 text-foreground hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {String(index).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-sm font-semibold leading-5">{OUTPUT_OPTION_LABELS[option]}</span>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-bold ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={selectAllOutputOptions}
              className="rounded-xl border border-border bg-background/70 px-3 py-3 text-sm font-semibold text-foreground"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearOutputOptions}
              className="rounded-xl border border-border bg-background/70 px-3 py-3 text-sm font-semibold text-foreground"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={buildPrompt}
              disabled={isBuildingPrompt}
              className="rounded-xl px-3 py-3 text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
            >
              {isBuildingPrompt ? "Generating..." : "Generate Prompt"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur md:p-6">
          <div className="mb-5 text-xl font-semibold tracking-[0.02em] text-foreground md:text-2xl">4. Student Profile</div>
          <div className="space-y-7">
            {PROFILE_GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.heading} className="space-y-4">
                  <div className="flex items-center gap-3 text-lg font-semibold text-foreground md:text-xl">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/60 text-primary">
                      <Icon size={18} />
                    </span>
                    <span>{group.heading}</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {group.options.map((option) => (
                      <SelectionCard
                        key={option}
                        checked={studentProfile.includes(option)}
                        label={PROFILE_LABELS[option]}
                        value={option}
                        onToggle={() => toggleProfile(option)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur md:p-6">
          <div className="mb-5 text-xl font-semibold tracking-[0.02em] text-foreground md:text-2xl">5. Teaching Depth</div>
          <div className="mb-5 space-y-7">
            {DEPTH_GROUPS.map((group) => (
              <div key={group.heading} className="space-y-4">
                <div className="text-lg font-semibold text-foreground md:text-xl">{group.heading}</div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.options.map((option) => (
                    <SelectionCard
                      key={option}
                      checked={depthOptions.includes(option)}
                      label={DEPTH_LABELS[option]}
                      value={option}
                      onToggle={() => toggleDepth(option)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              label="Required visual style"
              value={visualStyle}
              options={VISUAL_STYLE_OPTIONS}
              onChange={(value) => setVisualStyle(value as VisualStyleOption)}
            />
            <SelectField
              label="Required explanation style"
              value={explanationStyle}
              options={EXPLANATION_STYLE_OPTIONS}
              onChange={(value) => setExplanationStyle(value as ExplanationStyleOption)}
            />
          </div>

          <div className="mt-3">
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Objective</div>
            <textarea
              value={objective}
              onChange={(event) => {
                setWorkflowStep("generate");
                setObjective(event.target.value);
              }}
              className="min-h-24 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-elegant)] backdrop-blur md:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles size={14} />
              <span>6. Generate Prompt</span>
            </div>
            <button
              type="button"
              onClick={buildPrompt}
              disabled={isBuildingPrompt}
              className="rounded-2xl px-4 py-2 text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
            >
              <span className="inline-flex items-center gap-2">
                {isBuildingPrompt && <Loader2 size={15} className="animate-spin" />}
                {isBuildingPrompt ? "Building teaching prompt..." : "Build Prompt"}
              </span>
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Teacher's Depth builds a copy-ready ChatGPT prompt from your local educational inputs. No Gemini or ChatGPT call is made here.
          </p>

          <div aria-live="polite" className="sr-only">
            {announcement}
          </div>

          {buildStatus && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              {buildStatus}
            </div>
          )}

          {buildStages.length > 0 && (
            <div className="mt-4 rounded-2xl border border-border bg-background/50 p-3">
              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Build Progress</div>
              <div className="space-y-2 text-sm">
                {buildStages.map((stage) => (
                  <div key={stage.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2">
                    <span className="text-foreground">{stage.label}</span>
                    <span
                      className={`text-xs font-semibold ${
                        stage.status === "completed"
                          ? "text-emerald-300"
                          : stage.status === "in-progress"
                            ? "text-amber-200"
                            : "text-muted-foreground"
                      }`}
                    >
                      {stage.status === "completed" ? "✓ Completed" : stage.status === "in-progress" ? "⏳ In Progress..." : "○ Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {buildSuccess && (
            <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100 animate-in fade-in duration-300">
              ✓ {buildSuccess}
            </div>
          )}

          {emptyDetectionWarning && (
            <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
              <p className="font-semibold">⚠ No academic questions found.</p>
              <p className="mt-1">Suggestions:</p>
              <p>• Capture a clearer image</p>
              <p>• Crop unnecessary UI</p>
              <p>• Ensure the textbook/question is visible</p>
            </div>
          )}

          {buildError && (
            <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-3 text-sm text-red-100">
              <p className="font-semibold">Unable to build prompt.</p>
              <p className="mt-1">Reason: OCR extraction failed.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={buildPrompt} className="rounded-xl border border-border bg-card/70 px-3 py-2 text-xs text-foreground">
                  Retry
                </button>
                <button type="button" onClick={chooseImagesAgain} className="rounded-xl border border-border bg-card/70 px-3 py-2 text-xs text-foreground">
                  Choose Images Again
                </button>
                <button type="button" onClick={reportIssue} className="rounded-xl border border-border bg-card/70 px-3 py-2 text-xs text-foreground">
                  Report Issue
                </button>
              </div>
            </div>
          )}
        </section>

        <PromptPreview
          prompt={prompt}
          copied={copied}
          onCopyPrompt={copyPrompt}
          onSendToChatGpt={sendToChatGpt}
          sendStatus={sendStatus}
          summary={promptSummary}
        />

        <MasterImageWorkflow extracted={extracted} prompt={prompt} sourceExtraction={sourceExtractionContext} />
      </div>
    </AppShell>
  );
}

function ExtractField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-2xl border border-border bg-background/50 p-3">
      <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-sm text-foreground outline-none"
      />
    </label>
  );
}

function ExtractListField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <label className="rounded-2xl border border-border bg-background/50 p-3">
      <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <textarea
        value={formatListInput(values)}
        onChange={(event) => onChange(parseListInput(event.target.value))}
        placeholder="One item per line"
        className="min-h-24 w-full resize-y bg-transparent text-sm text-foreground outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-2xl border border-border bg-background/50 p-3">
      <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-sm text-foreground outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-background text-foreground">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectionCard({
  checked,
  label,
  value,
  onToggle,
}: {
  checked: boolean;
  label: string;
  value: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={value}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      className={`flex min-h-14 w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] ${
        checked
          ? "border-primary/55 bg-primary/12 text-foreground shadow-[var(--shadow-elegant)]"
          : "border-border bg-background/45 text-foreground/90"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background/80 text-transparent"
        }`}
      >
        <Check size={17} strokeWidth={3} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="text-[15px] font-semibold leading-6 text-foreground md:text-[16px] lg:text-[17px]">{label}</span>
      </span>
    </button>
  );
}
