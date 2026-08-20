import { Download, FileImage, Loader2, Sparkles, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { jsPDF } from "jspdf";
import {
  clearMasterTeachingImage,
  loadMasterTeachingImage,
  saveMasterTeachingImage,
} from "@/lib/teaching-engine/persistence";
import { ensureMinimumDisintegrationCards } from "@/lib/teaching-engine/disintegration";
import { buildFallbackTeachingImageAnalysis } from "@/lib/teaching-engine/masterImageFallback";
import {
  filterRelevantFormulaeByContext,
  getContextAwareFallbackFormula,
  pickKnownValue,
  sanitizeEducationalLines,
  sanitizeEducationalText,
  sanitizeEducationalTextByContext,
} from "@/lib/teaching-engine/contentIntegrity";
import { clearTeachingRunDerivedState, STORAGE_KEYS, useLocalStorage } from "@/lib/storage";
import type {
  ExtractedContent,
  TeachingCard,
  TeachingImageAnalysisResult,
} from "@/types/teaching-engine";

type MasterImageWorkflowProps = {
  extracted: ExtractedContent;
  prompt: string;
  sourceExtraction: {
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
};

type ImageMeta = {
  name: string;
  width: number;
  height: number;
  mime: string;
  size: number;
};

type ExportArtifact = {
  file: File;
  kind: "pdf" | "cards";
};

type ExportStatus = {
  kind: "pdf" | "cards";
  tone: "loading" | "success" | "error";
  message: string;
};

const EMPTY_ANALYSIS: TeachingImageAnalysisResult = {
  mainTopic: "",
  subtopics: [],
  sourceContent: [],
  additionalExamCoverage: [],
  definitions: [],
  formulae: [],
  workedExamples: [],
  diagrams: [],
  tables: [],
  importantFacts: [],
  examPoints: [],
  commonQuestionTypes: [],
  commonMistakes: [],
  revisionPoints: [],
  cards: [],
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function imageMetaFromFile(file: File): Promise<ImageMeta> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        name: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        mime: file.type || "image/png",
        size: file.size,
      });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read image dimensions."));
    };
    img.src = objectUrl;
  });
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [header, payload] = dataUrl.split(",");
  const mime = header.match(/data:(.*);base64/)?.[1] ?? "image/png";
  const bytes = atob(payload ?? "");
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new File([arr], fileName, { type: mime });
}

function safeLines(value: string, max = 12) {
  return sanitizeEducationalLines(value.split(/\r?\n/), max);
}

function pickResolvedMetadataValue(primary: string, fallback: string, defaultValue: string) {
  const resolved = pickKnownValue(primary, fallback);
  return resolved || defaultValue;
}

function resolveExtractedForWorkflow(
  extracted: ExtractedContent,
  sourceExtraction: MasterImageWorkflowProps["sourceExtraction"],
): ExtractedContent {
  const sourceText = sanitizeEducationalText(sourceExtraction.extractedText || extracted.ocrText || "");
  const subject = pickResolvedMetadataValue(extracted.subject, sourceExtraction.metadata.subject, "Not identified");
  const chapter = pickResolvedMetadataValue(extracted.chapter, sourceExtraction.metadata.chapter, "Not identified");
  const topic = pickResolvedMetadataValue(extracted.topic, sourceExtraction.metadata.topic, "Not identified");
  const inferredConcept = /\bconcave\b/i.test(sourceText) && /\bconvex\b/i.test(sourceText)
    ? "Concave/Convex Mirror"
    : /\bconcave\b/i.test(sourceText)
      ? "Concave Mirror"
      : /\bconvex\b/i.test(sourceText)
        ? "Convex Mirror"
        : "";
  const concept = pickKnownValue(extracted.concept, inferredConcept) || "Not identified";
  const rawContext = `${subject} ${sourceExtraction.metadata.board} ${sourceExtraction.metadata.classLevel} ${chapter} ${topic} ${sourceText}`;
  const formulae = filterRelevantFormulaeByContext(extracted.formulae, rawContext);

  return {
    ...extracted,
    ocrText: sourceText || extracted.ocrText,
    cleanedOcrText: sourceText || extracted.cleanedOcrText,
    subject,
    chapter,
    topic,
    concept,
    board: pickResolvedMetadataValue(extracted.board, sourceExtraction.metadata.board, "Not identified"),
    classLevel: pickResolvedMetadataValue(extracted.classLevel, sourceExtraction.metadata.classLevel, "Not identified"),
    questionType: pickResolvedMetadataValue(extracted.questionType, sourceExtraction.metadata.questionType, "Not identified"),
    language: pickResolvedMetadataValue(extracted.language, sourceExtraction.metadata.language, "English"),
    formulae,
  };
}

function hasKnownAcademicContext(extracted: ExtractedContent) {
  return (
    extracted.board !== "Not identified" &&
    extracted.classLevel !== "Not identified" &&
    extracted.board !== "Unknown" &&
    extracted.classLevel !== "Unknown"
  );
}

function buildGeneralExamCoverage(topic: string, subject: string) {
  return [
    `General exam-supporting coverage for ${topic} in ${subject}`,
    "Definition-focused recall questions",
    "Formula/concept application questions",
    "Reasoning and conceptual explanation questions",
    "Diagram labeling/interpreting questions where relevant",
  ];
}

export function buildMasterImageSpec(extracted: ExtractedContent, teachingResponse: string, prompt: string, sourceText = "") {
  const rawContext = `${extracted.subject} ${extracted.board} ${extracted.classLevel} ${extracted.chapter} ${extracted.topic} ${sourceText} ${teachingResponse}`;
  const cleanTeachingResponse = sanitizeEducationalTextByContext(teachingResponse, rawContext);
  const cleanSourceText = sanitizeEducationalTextByContext(sourceText, rawContext);
  const formulaContext = `${extracted.subject} ${extracted.board} ${extracted.classLevel} ${extracted.chapter} ${extracted.topic} ${cleanSourceText} ${cleanTeachingResponse}`;
  const inlineFormulaCandidates = Array.from(cleanTeachingResponse.matchAll(/[A-Za-z][A-Za-z0-9]*\s*=\s*[^\n,.;]+/g)).map((item) => item[0]);
  const keyFormulas = filterRelevantFormulaeByContext([...extracted.formulae, ...inlineFormulaCandidates], formulaContext);
  const fallbackFormula = getContextAwareFallbackFormula(formulaContext);
  const formulaCandidates = keyFormulas.length > 0
    ? keyFormulas
    : fallbackFormula
      ? [fallbackFormula]
      : ["Identify formulae from teaching response"];
  const keyDiagrams = extracted.diagrams.length > 0 ? extracted.diagrams : ["Create one clear labeled educational diagram"]; 
  const responseHighlights = safeLines(cleanTeachingResponse, 16);
  const sourceHighlights = safeLines(cleanSourceText, 10);
  const promptHighlights = safeLines(sanitizeEducationalTextByContext(prompt, formulaContext), 10);
  const topic = extracted.topic !== "Not identified" ? extracted.topic : "Detected Topic";
  const subject = extracted.subject !== "Not identified" ? extracted.subject : "Detected Subject";
  const knownAcademicContext = hasKnownAcademicContext(extracted);
  const coverageNote = knownAcademicContext
    ? `Gap-check using detected board/class context: ${extracted.board} / ${extracted.classLevel}.`
    : "Board/class unknown: add only general exam-supporting coverage and label it clearly as additional.";

  return [
    "Create a single comprehensive educational infographic covering the complete topic, organized into clearly separated logical teaching sections, with simple classroom language, readable formulas, labelled diagrams, worked examples, common mistakes, exam points and revision points.",
    "This is a MASTER LEARNING IMAGE for teacher-led classroom use, not a decorative poster.",
    "Do not summarize only the uploaded page. Perform exam-completeness gap check for the same topic.",
    "",
    `Subject: ${subject}`,
    `Chapter: ${extracted.chapter}`,
    `Topic: ${topic}`,
    `Board/Class context: ${extracted.board} / ${extracted.classLevel}`,
    `Language style: ${extracted.language}`,
    coverageNote,
    "",
    "Required image section structure:",
    "A. SOURCE CONTENT",
    "B. IMPORTANT ADDITIONAL EXAM COVERAGE",
    "C. FORMULAS / CONCEPTS",
    "D. VISUALS / DIAGRAMS",
    "E. WORKED EXAMPLES",
    "F. COMMON MISTAKES",
    "G. EXAM-IMPORTANT AREAS",
    "H. COMMON QUESTION TYPES",
    "I. QUICK REVISION",
    "",
    "Rules for SOURCE CONTENT vs ADDITIONAL EXAM COVERAGE:",
    "- SOURCE CONTENT must only include what is present in supplied source/response context.",
    "- IMPORTANT ADDITIONAL EXAM COVERAGE must include missing but relevant same-topic concepts.",
    "- Mark additional items clearly and do not claim they came from source.",
    "- Avoid unsupported exam probability claims.",
    "",
    "Formula candidates:",
    ...formulaCandidates.map((line) => `- ${line}`),
    "",
    "Diagram candidates:",
    ...keyDiagrams.map((line) => `- ${line}`),
    "",
    "Use this source content as primary truth:",
    ...(sourceHighlights.length > 0 ? sourceHighlights.map((line) => `- ${line}`) : ["- No direct source text provided"]),
    "",
    "Use this teaching-response content as secondary support:",
    ...(responseHighlights.length > 0 ? responseHighlights.map((line) => `- ${line}`) : ["- No direct teaching response provided"]),
    "",
    "Use this generated prompt context as secondary support:",
    ...(promptHighlights.length > 0 ? promptHighlights.map((line) => `- ${line}`) : ["- No prompt context provided"]),
    "",
    "Design constraints:",
    "- Keep typography highly readable for mobile screenshots and classroom display.",
    "- Separate sections with clear boxes or dividers.",
    "- Keep formulas mathematically accurate.",
    "- Avoid clutter; prioritize teaching clarity and sequence.",
  ].join("\n");
}

type TeachingSection = {
  heading: string;
  lines: string[];
};

function firstSentence(text: string, fallback: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  const sentence = normalized.split(/[.!?]/)[0]?.trim();
  return sentence && sentence.length > 0 ? sentence : fallback;
}

function detectPrimaryFormula(text: string) {
  const cleaned = sanitizeEducationalText(text);
  const match = cleaned.match(/[A-Za-z][A-Za-z0-9]*\s*=\s*[^\n,.;]+/);
  return match?.[0]?.trim() ?? "Formula not explicitly detected";
}

function fallbackVariableMeaning(formula: string) {
  const tokens = Array.from(new Set((formula.match(/[A-Za-z]+/g) ?? []).map((v) => v.trim())));
  if (tokens.length === 0) return ["Identify variable meanings from chapter context"];
  return tokens.map((token) => `${token}: explain meaning in chapter context`);
}

function buildLocalTeachingSections(extracted: ExtractedContent, teachingResponse: string) {
  const cleanedTeachingResponse = sanitizeEducationalText(teachingResponse);
  const topic = extracted.topic !== "Not identified" ? extracted.topic : "Detected Topic";
  const chapter = extracted.chapter !== "Not identified" ? extracted.chapter : "Detected Chapter";
  const subject = extracted.subject !== "Not identified" ? extracted.subject : "Detected Subject";
  const formulaContext = `${extracted.subject} ${extracted.board} ${extracted.classLevel} ${extracted.chapter} ${extracted.topic} ${cleanedTeachingResponse}`;
  const formula = filterRelevantFormulaeByContext(
    [...extracted.formulae, detectPrimaryFormula(cleanedTeachingResponse)],
    formulaContext,
  )[0] ?? (getContextAwareFallbackFormula(formulaContext) || "Formula not explicitly detected");
  const variableMeanings = fallbackVariableMeaning(formula);
  const keyPoints = safeLines(cleanedTeachingResponse, 18);
  const knownAcademicContext = hasKnownAcademicContext(extracted);
  const additionalCoverage = knownAcademicContext
    ? [
        `Add missing ${topic} sub-concepts relevant for ${extracted.board} ${extracted.classLevel}.`,
        "Include common exam-focused applications and conceptual reasoning.",
      ]
    : buildGeneralExamCoverage(topic, subject);

  const sections: TeachingSection[] = [
    {
      heading: `A. SOURCE CONTENT - ${topic} (${chapter})`,
      lines: [
        firstSentence(cleanedTeachingResponse, "Concept summary based on the generated teaching response."),
        `Subject: ${extracted.subject}`,
      ],
    },
    {
      heading: "B. IMPORTANT ADDITIONAL EXAM COVERAGE",
      lines: additionalCoverage,
    },
    {
      heading: "C. FORMULAS / CONCEPTS",
      lines: [
        firstSentence(cleanedTeachingResponse, "Definition and concept extracted from response."),
        "Important condition: apply concept only under valid assumptions given in class.",
        `Formula: ${formula}`,
        ...variableMeanings,
        "Include SI units while teaching and solving.",
      ],
    },
    {
      heading: "D. VISUALS / DIAGRAMS",
      lines: [
        "Draw one clean board diagram with labels.",
        "Explain logical relationship visually.",
        ...((extracted.diagrams.length > 0 ? extracted.diagrams : ["Add labels for all key parts"]).slice(0, 2)),
      ],
    },
    {
      heading: "E. WORKED EXAMPLES",
      lines: [
        "Use a small-number example with step-by-step substitution.",
        ...(extracted.numericalQuestions.slice(0, 2)),
      ],
    },
    {
      heading: "F. COMMON MISTAKES",
      lines: [
        "Wrong unit usage or wrong substitution order.",
        "Write formula first, then substitute values clearly.",
      ],
    },
    {
      heading: "G. EXAM-IMPORTANT AREAS",
      lines: [
        `Exam importance: ${extracted.examImportance}`,
        "Definition + formula + application must be exam-ready.",
      ],
    },
    {
      heading: "H. COMMON QUESTION TYPES",
      lines: [
        "Definition questions",
        "Formula-based substitution questions",
        "Numerical/application questions",
        "Reasoning/conceptual explanation questions",
        "Diagram-based questions where relevant",
      ],
    },
    {
      heading: "I. QUICK REVISION",
      lines: keyPoints.length > 0 ? keyPoints.slice(0, 5) : ["Revision bullets based on teaching response."],
    },
  ];

  return sections;
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }

  return cursorY;
}

async function generateLocalTeachingImageDataUrl(extracted: ExtractedContent, teachingResponse: string) {
  const width = 1400;
  const height = 2000;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context is unavailable.");

  const sections = buildLocalTeachingSections(extracted, teachingResponse);

  ctx.fillStyle = "#f5f1e8";
  ctx.fillRect(0, 0, width, height);

  const accentA = "#183a37";
  const accentB = "#37505c";
  const textDark = "#0f172a";

  ctx.fillStyle = accentA;
  ctx.fillRect(0, 0, width, 130);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 44px Georgia";
  ctx.fillText("MASTER TEACHING IMAGE", 50, 80);

  ctx.font = "600 26px Georgia";
  const subtitle = `${extracted.subject} - ${extracted.chapter} - ${extracted.topic}`;
  ctx.fillText(subtitle.replace(/Not identified/g, "Detected Context"), 50, 115);

  let y = 160;
  const cardWidth = width - 100;
  const sectionGap = 18;

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const boxX = 50;
    const boxY = y;
    const boxHeight = 190;

    ctx.fillStyle = index % 2 === 0 ? "#fffefc" : "#f8f5f0";
    ctx.strokeStyle = accentB;
    ctx.lineWidth = 2;
    ctx.fillRect(boxX, boxY, cardWidth, boxHeight);
    ctx.strokeRect(boxX, boxY, cardWidth, boxHeight);

    ctx.fillStyle = accentA;
    ctx.fillRect(boxX, boxY, cardWidth, 40);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 24px Arial";
    ctx.fillText(`${index + 1}. ${section.heading}`, boxX + 14, boxY + 28);

    ctx.fillStyle = textDark;
    ctx.font = "500 20px Arial";

    let lineY = boxY + 66;
    const maxLineWidth = cardWidth - 28;
    for (const line of section.lines.slice(0, 6)) {
      lineY = wrapCanvasText(ctx, `- ${line}`, boxX + 14, lineY, maxLineWidth, 24);
      if (lineY > boxY + boxHeight - 16) break;
    }

    y += boxHeight + sectionGap;
    if (y + boxHeight > height - 20) {
      break;
    }
  }

  ctx.fillStyle = accentA;
  ctx.font = "600 18px Arial";
  ctx.fillText("Teacher's Depth - Classroom-ready topic map", 50, height - 24);

  return canvas.toDataURL("image/png");
}

function fallbackAnalysisFromContext(extracted: ExtractedContent, teachingResponse: string): TeachingImageAnalysisResult {
  const cleanedTeachingResponse = sanitizeEducationalText(teachingResponse);
  const formulaContext = `${extracted.subject} ${extracted.board} ${extracted.classLevel} ${extracted.chapter} ${extracted.topic} ${cleanedTeachingResponse}`;
  const formula = filterRelevantFormulaeByContext(
    [...extracted.formulae, detectPrimaryFormula(cleanedTeachingResponse)],
    formulaContext,
  )[0] ?? (getContextAwareFallbackFormula(formulaContext) || "Formula not explicitly detected");
  const topic = extracted.topic !== "Not identified" ? extracted.topic : "Detected Topic";
  const chapter = extracted.chapter !== "Not identified" ? extracted.chapter : "Detected Chapter";
  const points = safeLines(cleanedTeachingResponse, 14);
  const knownAcademicContext = hasKnownAcademicContext(extracted);
  const sourceContent = points.length > 0
    ? points.slice(0, 6)
    : ["Source content unavailable. Use uploaded source + teacher response."];
  const additionalExamCoverage = knownAcademicContext
    ? [
        `Missing same-topic exam coverage for ${extracted.board} ${extracted.classLevel}.`,
        "Include extra conceptual and application forms likely asked in exams.",
      ]
    : buildGeneralExamCoverage(topic, extracted.subject !== "Not identified" ? extracted.subject : "Detected Subject");

  const definitions = [
    {
      title: `${topic} Definition`,
      text: firstSentence(cleanedTeachingResponse, `Core definition for ${topic}.`),
    },
  ];

  const formulae = formula && formula !== "Formula not explicitly detected"
    ? [{ formula, meaning: "Use this formula to relate key variables in the topic.", units: "Use standard SI units as applicable." }]
    : [];

  const workedExamples = [
    {
      title: "Worked Example",
      problem: extracted.numericalQuestions[0] ?? `Solve one classroom problem from ${topic}.`,
      steps: "1) Write formula\n2) Substitute values with units\n3) Solve carefully\n4) State final answer with unit",
    },
  ];

  const commonMistakes = [
    "Skipping unit conversion before substitution",
    "Using wrong variable arrangement",
    "Missing final unit in answer",
  ];

  const examPoints = [
    `Exam importance: ${extracted.examImportance}`,
    "Be ready to explain concept + formula + one solved example",
    "Include examiner trap checks and unit consistency",
  ];

  const commonQuestionTypes = [
    "Definition questions",
    "Formula-based questions",
    "Numerical/application questions",
    "Diagram-based questions",
    "Reasoning/conceptual questions",
  ];

  const revisionPoints = points.length > 0 ? points.slice(0, 5) : ["Revise definition, formula, and one worked example."];

  const cards: TeachingCard[] = [
    {
      title: `${topic} - Basic Idea`,
      explanation: definitions[0].text,
      keyPoints: revisionPoints.slice(0, 3),
    },
    {
      title: "Definition",
      explanation: definitions[0].text,
      keyPoints: ["State in simple classroom language"],
    },
    {
      title: "Important Additional Exam Coverage",
      explanation: additionalExamCoverage.join(" "),
      keyPoints: additionalExamCoverage,
      examImportance: knownAcademicContext
        ? `${extracted.board} ${extracted.classLevel} aligned supporting coverage`
        : "General exam-supporting coverage (board/class not identified)",
    },
    {
      title: "Formula",
      explanation: formulae[0]?.meaning ?? "Formula not detected from response.",
      keyPoints: formulae[0] ? [formulae[0].units] : ["Explain variable meanings from context"],
      formula: formulae[0]?.formula,
      examImportance: examPoints[0],
    },
    {
      title: "Worked Example",
      explanation: workedExamples[0].problem,
      keyPoints: safeLines(workedExamples[0].steps, 4),
      example: workedExamples[0].steps,
    },
    {
      title: "Common Mistakes",
      explanation: "Avoid these typical errors.",
      keyPoints: commonMistakes,
      commonMistake: commonMistakes[0],
    },
    {
      title: "Exam Revision",
      explanation: "Final revision checklist before class or exam.",
      keyPoints: revisionPoints,
      examImportance: examPoints.join(" | "),
    },
  ];

  return {
    mainTopic: topic,
    subtopics: [chapter, "Definition", "Formula", "Example", "Revision"],
    sourceContent,
    additionalExamCoverage,
    definitions,
    formulae,
    workedExamples,
    diagrams: [{ title: "Classroom Diagram", description: extracted.diagrams[0] ?? "Draw and label a simple conceptual diagram." }],
    tables: extracted.hasTables ? [{ title: "Detected Table", description: "A summary table is present in source context." }] : [],
    importantFacts: points.slice(0, 4),
    examPoints,
    commonQuestionTypes,
    commonMistakes,
    revisionPoints,
    cards,
  };
}

function mergeCardsFromAnalysis(analysis: TeachingImageAnalysisResult) {
  if (analysis.cards.length > 0) {
    return analysis.cards;
  }

  const fallbackCards: TeachingCard[] = [];

  if (analysis.mainTopic) {
    fallbackCards.push({
      title: `${analysis.mainTopic} - Basic Idea`,
      explanation: analysis.definitions[0]?.text ?? "Core idea extracted from master learning image.",
      keyPoints: analysis.importantFacts.slice(0, 4),
    });
  }

  for (const definition of analysis.definitions) {
    fallbackCards.push({
      title: definition.title,
      explanation: definition.text,
      keyPoints: analysis.revisionPoints.slice(0, 3),
    });
  }

  for (const formula of analysis.formulae) {
    fallbackCards.push({
      title: `Formula: ${formula.formula}`,
      explanation: formula.meaning,
      keyPoints: formula.units ? [`Units: ${formula.units}`] : [],
      formula: formula.formula,
      examImportance: analysis.examPoints[0] ?? "",
    });
  }

  for (const example of analysis.workedExamples) {
    fallbackCards.push({
      title: example.title,
      explanation: example.problem,
      keyPoints: safeLines(example.steps, 5),
      example: example.steps,
    });
  }

  if (analysis.commonMistakes.length > 0) {
    fallbackCards.push({
      title: "Common Mistakes",
      explanation: "Avoid these errors while solving or explaining the topic.",
      keyPoints: analysis.commonMistakes.slice(0, 6),
      commonMistake: analysis.commonMistakes[0],
    });
  }

  if (analysis.revisionPoints.length > 0) {
    fallbackCards.push({
      title: "Exam Revision",
      explanation: "Quick revision for exam preparation.",
      keyPoints: analysis.revisionPoints.slice(0, 8),
      examImportance: analysis.examPoints.join(" | "),
    });
  }

  return fallbackCards;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isLikelyMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.matchMedia("(pointer: coarse)").matches;
}

async function triggerBrowserDownload(blob: Blob, fileName: string) {
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error("Generated file is empty.");
  }

  const url = URL.createObjectURL(blob);

  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    a.setAttribute("aria-hidden", "true");
    a.target = "_self";
    document.body.appendChild(a);

    try {
      a.click();
    } catch (error) {
      const message = error instanceof Error ? error.message : "The browser blocked the automatic download.";
      throw new Error(`The browser blocked the automatic download. ${message}`);
    } finally {
      a.remove();
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), 400);
    });
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 45000);
  }
}

function makeFileFromBlob(blob: Blob, fileName: string, mimeType: string) {
  return new File([blob], fileName, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

async function openFileInBrowser(file: File) {
  const url = URL.createObjectURL(file);
  try {
    window.open(url, "_blank", "noopener,noreferrer");
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1500);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function shareFileWithBrowser(file: File) {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (!nav.share) {
    throw new Error("Share is not supported on this browser.");
  }

  const shareData: ShareData = {
    files: [file],
    title: file.name,
    text: `Teacher's Depth export: ${file.name}`,
  };

  if (nav.canShare && !nav.canShare(shareData)) {
    throw new Error("This browser cannot share the generated file.");
  }

  await nav.share(shareData);
}

async function renderTeachingCardBlob(card: TeachingCard, cardIndex: number, totalCards: number) {
  const width = 1400;
  const height = 900;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context is unavailable for card export.");
  }

  const bg = "#f8f5ef";
  const accent = "#183a37";
  const accentSoft = "#d8e3df";
  const text = "#0f172a";
  const muted = "#475569";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, 120);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 42px Georgia";
  ctx.fillText("Teacher's Depth Teaching Card", 50, 72);
  ctx.font = "500 22px Arial";
  ctx.fillText(`Card ${cardIndex + 1} of ${totalCards}`, 50, 102);

  ctx.fillStyle = "#fffdf8";
  ctx.strokeStyle = accentSoft;
  ctx.lineWidth = 3;
  ctx.fillRect(40, 145, width - 80, height - 200);
  ctx.strokeRect(40, 145, width - 80, height - 200);

  let y = 200;
  const x = 70;
  const maxWidth = width - 140;

  ctx.fillStyle = accent;
  ctx.font = "700 34px Arial";
  y = wrapCanvasText(ctx, card.title || "Untitled", x, y, maxWidth, 42);

  ctx.fillStyle = text;
  ctx.font = "500 24px Arial";
  y += 12;
  y = wrapCanvasText(ctx, card.explanation || "No explanation available.", x, y, maxWidth, 34);

  if (card.keyPoints.length > 0) {
    y += 18;
    ctx.fillStyle = accent;
    ctx.font = "700 24px Arial";
    ctx.fillText("Key Points", x, y);
    y += 28;
    ctx.fillStyle = text;
    ctx.font = "500 22px Arial";
    for (const point of card.keyPoints.slice(0, 8)) {
      y = wrapCanvasText(ctx, `- ${point}`, x, y, maxWidth, 30);
      if (y > height - 150) break;
    }
  }

  const detailLines = [
    card.formula ? `Formula: ${card.formula}` : "",
    card.diagram ? `Diagram: ${card.diagram}` : "",
    card.example ? `Example: ${card.example}` : "",
    card.examImportance ? `Exam Importance: ${card.examImportance}` : "",
    card.commonMistake ? `Common Mistake: ${card.commonMistake}` : "",
  ].filter(Boolean);

  if (detailLines.length > 0 && y < height - 120) {
    y += 16;
    ctx.fillStyle = muted;
    ctx.font = "500 21px Arial";
    for (const line of detailLines.slice(0, 4)) {
      y = wrapCanvasText(ctx, line, x, y, maxWidth, 28);
      if (y > height - 100) break;
    }
  }

  ctx.fillStyle = accent;
  ctx.font = "600 18px Arial";
  ctx.fillText("Teacher's Depth - Classroom-ready export", 50, height - 32);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode card image."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

async function renderTeachingCardsSheetBlob(cards: TeachingCard[]) {
  const width = 1600;
  const cardHeight = 620;
  const gap = 30;
  const height = Math.max(900, 80 + cards.length * (cardHeight + gap));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context is unavailable for teaching cards export.");
  }

  ctx.fillStyle = "#f8f5ef";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#183a37";
  ctx.fillRect(0, 0, width, 110);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 40px Georgia";
  ctx.fillText("Teacher's Depth Teaching Cards", 50, 68);
  ctx.font = "500 22px Arial";
  ctx.fillText(`${cards.length} cards`, 50, 98);

  let y = 145;
  const cardWidth = width - 80;
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    ctx.fillStyle = "#fffdf8";
    ctx.strokeStyle = "#d8e3df";
    ctx.lineWidth = 2;
    ctx.fillRect(40, y, cardWidth, cardHeight);
    ctx.strokeRect(40, y, cardWidth, cardHeight);

    ctx.fillStyle = "#183a37";
    ctx.fillRect(40, y, cardWidth, 46);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 24px Arial";
    ctx.fillText(`Card ${index + 1}: ${card.title || "Untitled"}`, 58, y + 30);

    let lineY = y + 82;
    const maxWidth = cardWidth - 36;
    ctx.fillStyle = "#0f172a";
    ctx.font = "500 22px Arial";
    lineY = wrapCanvasText(ctx, card.explanation || "No explanation available.", 58, lineY, maxWidth, 30);

    if (card.keyPoints.length > 0) {
      lineY += 14;
      ctx.fillStyle = "#183a37";
      ctx.font = "700 22px Arial";
      ctx.fillText("Key Points", 58, lineY);
      lineY += 26;
      ctx.fillStyle = "#0f172a";
      ctx.font = "500 20px Arial";
      for (const point of card.keyPoints.slice(0, 5)) {
        lineY = wrapCanvasText(ctx, `- ${point}`, 58, lineY, maxWidth, 28);
      }
    }

    const detailLines = [
      card.formula ? `Formula: ${card.formula}` : "",
      card.diagram ? `Diagram: ${card.diagram}` : "",
      card.example ? `Example: ${card.example}` : "",
      card.examImportance ? `Exam Importance: ${card.examImportance}` : "",
    ].filter(Boolean);

    if (detailLines.length > 0) {
      lineY += 12;
      ctx.fillStyle = "#475569";
      ctx.font = "500 19px Arial";
      for (const line of detailLines.slice(0, 3)) {
        lineY = wrapCanvasText(ctx, line, 58, lineY, maxWidth, 26);
      }
    }

    y += cardHeight + gap;
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode teaching cards image."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export function MasterImageWorkflow({ extracted, prompt, sourceExtraction }: MasterImageWorkflowProps) {
  const importInputRef = useRef<HTMLInputElement>(null);

  const [teachingResponse, setTeachingResponse] = useLocalStorage(
    STORAGE_KEYS.teachingEngineResponse,
    "",
  );
  const [imageSpec, setImageSpec] = useLocalStorage(
    STORAGE_KEYS.teachingEngineImageSpec,
    "",
  );
  const [analysis, setAnalysis] = useLocalStorage<TeachingImageAnalysisResult>(
    STORAGE_KEYS.teachingEngineImageAnalysis,
    EMPTY_ANALYSIS,
  );
  const [cards, setCards] = useLocalStorage<TeachingCard[]>(
    STORAGE_KEYS.teachingEngineCards,
    [],
  );

  const [masterImageFile, setMasterImageFile] = useState<File | null>(null);
  const [masterImageUrl, setMasterImageUrl] = useState<string>("");
  const [masterImageMeta, setMasterImageMeta] = useState<ImageMeta | null>(null);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isCreatingCards, setIsCreatingCards] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingCard, setIsDownloadingCard] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [exportArtifact, setExportArtifact] = useState<ExportArtifact | null>(null);
  const [showDownloadHelp, setShowDownloadHelp] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const resolvedExtracted = useMemo(
    () => resolveExtractedForWorkflow(extracted, sourceExtraction),
    [extracted, sourceExtraction],
  );

  const resetCurrentRunState = () => {
    clearTeachingRunDerivedState();
    void clearMasterTeachingImage();
    setMasterImageFile(null);
    setMasterImageUrl("");
    setMasterImageMeta(null);
    setTeachingResponse("");
    setImageSpec("");
    setAnalysis(EMPTY_ANALYSIS);
    setCards([]);
    setExportArtifact(null);
    setExportStatus(null);
    setWorkflowError(null);
    setWorkflowNotice("Current teaching run reset for the latest source.");
  };

  const canGenerateImage = useMemo(
    () => teachingResponse.trim().length > 0 || prompt.trim().length > 0,
    [teachingResponse, prompt],
  );

  const hasCards = cards.length > 0;
  const hasAnalysis = analysis.mainTopic.trim().length > 0 || analysis.cards.length > 0;
  const canShareExport = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void>; canShare?: (data: ShareData) => boolean };
    return !!nav.share;
  }, []);

  const currentSourceSignature = useMemo(
    () => JSON.stringify({
      sourceText: sourceExtraction.extractedText,
      subject: extracted.subject,
      chapter: extracted.chapter,
      topic: extracted.topic,
      board: extracted.board,
      classLevel: extracted.classLevel,
    }),
    [extracted.board, extracted.chapter, extracted.classLevel, extracted.subject, extracted.topic, sourceExtraction.extractedText],
  );

  const lastSourceSignatureRef = useRef<string>("");

  useEffect(() => {
    const previousSignature = lastSourceSignatureRef.current;
    if (!currentSourceSignature || currentSourceSignature === previousSignature) {
      return;
    }

    if (previousSignature && previousSignature !== currentSourceSignature) {
      resetCurrentRunState();
    }

    lastSourceSignatureRef.current = currentSourceSignature;
  }, [currentSourceSignature]);

  useEffect(() => {
    let active = true;

    void loadMasterTeachingImage().then(async (file) => {
      if (!active || !file) return;
      const url = await fileToDataUrl(file);
      const meta = await imageMetaFromFile(file);
      if (!active) return;
      setMasterImageFile(file);
      setMasterImageUrl(url);
      setMasterImageMeta(meta);
    }).catch(() => {
      // Ignore hydration failures for image persistence.
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setActiveCardIndex((prev) => (cards.length === 0 ? 0 : Math.min(prev, cards.length - 1)));
  }, [cards.length]);

  function onCreateImageSpec() {
    const rawContext = `${resolvedExtracted.subject} ${resolvedExtracted.board} ${resolvedExtracted.classLevel} ${resolvedExtracted.chapter} ${resolvedExtracted.topic} ${sourceExtraction.extractedText} ${teachingResponse}`;
    const nextSpec = buildMasterImageSpec(
      resolvedExtracted,
      sanitizeEducationalTextByContext(teachingResponse, rawContext),
      sanitizeEducationalTextByContext(prompt, rawContext),
      sourceExtraction.extractedText,
    );
    setImageSpec(nextSpec);
    setWorkflowError(null);
    setWorkflowNotice("Image-generation instruction updated from current teaching response.");
  }

  function onDownloadMasterImage() {
    if (!masterImageUrl) return;
    const a = document.createElement("a");
    a.href = masterImageUrl;
    a.download = masterImageMeta?.name || `master-learning-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function runAutomaticDisintegration(source: {
    file: File;
    dataUrl: string;
    origin: "generated" | "imported";
  }) {
    const analyzed = await onAnalyzeImage({
      file: source.file,
      dataUrl: source.dataUrl,
      suppressNotice: true,
    });

    if (!analyzed) {
      return;
    }

    const created = await onCreateTeachingCards(analyzed, { suppressNotice: true });

    if (created.length > 0) {
      const originLabel = source.origin === "generated" ? "Generated" : "Imported";
      setWorkflowNotice(
        `${originLabel} master image analyzed and automatically disintegrated into ${created.length} teaching cards.`,
      );
    }
  }

  async function onGenerateTeachingImage() {
    if (!imageSpec.trim()) {
      onCreateImageSpec();
    }

    const rawContext = `${resolvedExtracted.subject} ${resolvedExtracted.board} ${resolvedExtracted.classLevel} ${resolvedExtracted.chapter} ${resolvedExtracted.topic} ${sourceExtraction.extractedText} ${teachingResponse}`;
    const cleanedTeachingResponse = sanitizeEducationalTextByContext(teachingResponse, rawContext);
    const cleanedPrompt = sanitizeEducationalTextByContext(prompt, rawContext);
    const finalSpec = imageSpec.trim() || buildMasterImageSpec(resolvedExtracted, cleanedTeachingResponse, cleanedPrompt, sourceExtraction.extractedText);

    setIsGeneratingImage(true);
    setWorkflowError(null);
    setWorkflowNotice(null);

    try {
      let dataUrl = "";
      let notice = "";

      try {
        const res = await fetch("/api/diagram-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: finalSpec }),
        });

        if (!res.ok) {
          throw new Error((await res.text()) || `Image generation failed (${res.status})`);
        }

        const payload = (await res.json()) as { dataUrl: string };
        dataUrl = payload.dataUrl;
        notice = "Master teaching image generated using local prompt-builder rendering.";
      } catch {
        dataUrl = await generateLocalTeachingImageDataUrl(resolvedExtracted, cleanedTeachingResponse || cleanedPrompt);
        notice = "Generated a local comprehensive master teaching image from current teaching response.";
      }

      const file = dataUrlToFile(dataUrl, `master-learning-image-${Date.now()}.png`);
      const meta = await imageMetaFromFile(file);

      setMasterImageFile(file);
      setMasterImageUrl(dataUrl);
      setMasterImageMeta(meta);
      await saveMasterTeachingImage(file);
      setWorkflowNotice(`${notice} Running automatic structured disintegration...`);
      await runAutomaticDisintegration({ file, dataUrl, origin: "generated" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate teaching image.";
      setWorkflowError(message);
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function onImportImage(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    setWorkflowError(null);
    setWorkflowNotice(null);

    try {
      const url = await fileToDataUrl(selected);
      const meta = await imageMetaFromFile(selected);
      setMasterImageFile(selected);
      setMasterImageUrl(url);
      setMasterImageMeta(meta);
      await saveMasterTeachingImage(selected);
      setWorkflowNotice("Master teaching image imported successfully. Running automatic structured disintegration...");
      await runAutomaticDisintegration({ file: selected, dataUrl: url, origin: "imported" });
    } catch {
      setWorkflowError("Unable to read selected image.");
    } finally {
      event.target.value = "";
    }
  }

  async function onRemoveImage() {
    setMasterImageFile(null);
    setMasterImageUrl("");
    setMasterImageMeta(null);
    setAnalysis(EMPTY_ANALYSIS);
    setCards([]);
    setActiveCardIndex(0);
    setWorkflowNotice("Master teaching image removed.");
    await clearMasterTeachingImage();
  }

  async function onAnalyzeImage(options?: {
    file?: File;
    dataUrl?: string;
    suppressNotice?: boolean;
  }) {
    const file = options?.file ?? masterImageFile;
    const dataUrl = options?.dataUrl ?? masterImageUrl;

    if (!file || !dataUrl) return null;

    setIsAnalyzingImage(true);
    setWorkflowError(null);
    if (!options?.suppressNotice) {
      setWorkflowNotice(null);
    }

    try {
      const res = await fetch("/api/teaching-image-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: resolvedExtracted.subject,
          chapter: resolvedExtracted.chapter,
          topic: resolvedExtracted.topic,
          teachingResponse: sanitizeEducationalTextByContext(teachingResponse, `${resolvedExtracted.subject} ${resolvedExtracted.board} ${resolvedExtracted.classLevel} ${resolvedExtracted.chapter} ${resolvedExtracted.topic} ${sourceExtraction.extractedText}`),
          sourceExtractedText: sanitizeEducationalTextByContext(sourceExtraction.extractedText, `${resolvedExtracted.subject} ${resolvedExtracted.board} ${resolvedExtracted.classLevel} ${resolvedExtracted.chapter} ${resolvedExtracted.topic}`),
          sourceFormulae: filterRelevantFormulaeByContext(
            resolvedExtracted.formulae,
            `${resolvedExtracted.subject} ${resolvedExtracted.board} ${resolvedExtracted.classLevel} ${resolvedExtracted.chapter} ${resolvedExtracted.topic} ${sourceExtraction.extractedText}`,
          ),
          sourceNumericalQuestions: sanitizeEducationalLines(resolvedExtracted.numericalQuestions, 8),
          sourceExtractionMetadata: {
            ...sourceExtraction.metadata,
            subject: resolvedExtracted.subject,
            chapter: resolvedExtracted.chapter,
            topic: resolvedExtracted.topic,
            concept: resolvedExtracted.concept,
          },
          file: {
            name: file.name,
            mime: file.type || "image/png",
            dataUrl,
          },
        }),
      });

      if (!res.ok) {
        throw new Error((await res.text()) || `Image analysis failed (${res.status})`);
      }

      const payload = (await res.json()) as TeachingImageAnalysisResult;
      const nextAnalysis: TeachingImageAnalysisResult = {
        ...EMPTY_ANALYSIS,
        ...payload,
        subtopics: payload.subtopics ?? [],
        sourceContent: payload.sourceContent ?? [],
        additionalExamCoverage: payload.additionalExamCoverage ?? [],
        definitions: payload.definitions ?? [],
        formulae: payload.formulae ?? [],
        workedExamples: payload.workedExamples ?? [],
        diagrams: payload.diagrams ?? [],
        tables: payload.tables ?? [],
        importantFacts: payload.importantFacts ?? [],
        examPoints: payload.examPoints ?? [],
        commonQuestionTypes: payload.commonQuestionTypes ?? [],
        commonMistakes: payload.commonMistakes ?? [],
        revisionPoints: payload.revisionPoints ?? [],
        cards: payload.cards ?? [],
      };
      setAnalysis(nextAnalysis);
      if (!options?.suppressNotice) {
        setWorkflowNotice("Master image structurally analyzed using prompt-builder local workflow.");
      }
      return nextAnalysis;
    } catch (error) {
      const localAnalysis = buildFallbackTeachingImageAnalysis(
        resolvedExtracted,
        sanitizeEducationalTextByContext(
          teachingResponse || imageSpec || prompt,
          `${resolvedExtracted.subject} ${resolvedExtracted.board} ${resolvedExtracted.classLevel} ${resolvedExtracted.chapter} ${resolvedExtracted.topic} ${sourceExtraction.extractedText}`,
        ),
      );
      setAnalysis(localAnalysis);
      if (!options?.suppressNotice) {
        setWorkflowNotice("Applied local structural disintegration from current project context.");
      }
      return localAnalysis;
    } finally {
      setIsAnalyzingImage(false);
    }
  }

  async function onCreateTeachingCards(
    sourceAnalysis?: TeachingImageAnalysisResult,
    options?: { suppressNotice?: boolean },
  ) {
    setIsCreatingCards(true);
    setWorkflowError(null);
    if (!options?.suppressNotice) {
      setWorkflowNotice(null);
    }

    try {
      const merged = ensureMinimumDisintegrationCards(sourceAnalysis ?? analysis);
      if (merged.length === 0) {
        throw new Error("No cards could be derived from this image. Try re-analyzing with a clearer image.");
      }
      setCards(merged);
      setActiveCardIndex(0);
      if (!options?.suppressNotice) {
        setWorkflowNotice(`Created ${merged.length} teaching cards in logical sequence with coverage safeguards.`);
      }
      return merged;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create cards.";
      setWorkflowError(message);
      return [];
    } finally {
      setIsCreatingCards(false);
    }
  }

  async function onDownloadCards() {
    if (!hasCards || isDownloadingCard) return;

    setIsDownloadingCard(true);
    setWorkflowError(null);
    setWorkflowNotice(null);
    setShowDownloadHelp(false);
    setExportStatus({
      kind: "cards",
      tone: "loading",
      message: "Generating teaching cards...",
    });

    try {
      if (cards.length === 0) {
        throw new Error("Teaching cards are not available yet.");
      }

      const pngBlob = cards.length === 1
        ? await renderTeachingCardBlob(cards[0], 0, 1)
        : await renderTeachingCardsSheetBlob(cards);

      if (pngBlob.size <= 0 || pngBlob.type !== "image/png") {
        throw new Error("Teaching cards file could not be generated.");
      }

      const fileName = cards.length === 1
        ? "Teacher-Depth-Teaching-Card.png"
        : "Teacher-Depth-Teaching-Cards.png";
      const exportFile = makeFileFromBlob(pngBlob, fileName, "image/png");

      await triggerBrowserDownload(exportFile, fileName);
      setExportArtifact({ file: exportFile, kind: "cards" });
      setExportStatus({
        kind: "cards",
        tone: "success",
        message: "Teaching Cards downloaded successfully.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Teaching cards generation failed. Please try again.";
      console.error("Teaching cards export failed", error);
      setWorkflowError(message);
      setExportStatus({
        kind: "cards",
        tone: "error",
        message: "Download could not be started. Please try again.",
      });
    } finally {
      setIsDownloadingCard(false);
    }
  }

  async function onDownloadPdf() {
    if (!hasCards || isDownloadingPdf) return;

    setIsDownloadingPdf(true);
    setWorkflowError(null);
    setWorkflowNotice(null);
    setShowDownloadHelp(false);
    setExportStatus({
      kind: "pdf",
      tone: "loading",
      message: "Preparing PDF...",
    });

    try {
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const left = 40;
      const right = pageWidth - 40;
      const maxWidth = right - left;

      cards.forEach((card, index) => {
        if (index > 0) pdf.addPage();

        let y = 48;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text(`Card ${index + 1} of ${cards.length}`, left, y);

        y += 24;
        pdf.setFontSize(14);
        pdf.text(card.title || "Untitled", left, y);

        y += 20;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);

        const lines = [
          `Explanation: ${card.explanation || "-"}`,
          card.formula ? `Formula: ${card.formula}` : "",
          card.diagram ? `Diagram: ${card.diagram}` : "",
          card.example ? `Example: ${card.example}` : "",
          card.examImportance ? `Exam Importance: ${card.examImportance}` : "",
          card.commonMistake ? `Common Mistake: ${card.commonMistake}` : "",
          card.keyPoints.length > 0 ? `Key Points: ${card.keyPoints.join(" | ")}` : "",
        ].filter(Boolean);

        const wrapped = pdf.splitTextToSize(lines.join("\n\n"), maxWidth);
        pdf.text(wrapped, left, y);

        if (y + wrapped.length * 14 > pageHeight - 50) {
          // Keep rendering simple and deterministic if card content is very long.
          pdf.setFontSize(10);
          pdf.text("Content truncated. Refer to teaching cards for full details.", left, pageHeight - 30);
        }
      });

      const pdfBlob = pdf.output("blob");
      if (!(pdfBlob instanceof Blob) || pdfBlob.size === 0 || pdfBlob.type !== "application/pdf") {
        throw new Error("PDF generation failed. Please try again.");
      }

      const exportFile = makeFileFromBlob(pdfBlob, "Teacher-Depth-Teaching.pdf", "application/pdf");

      await triggerBrowserDownload(exportFile, "Teacher-Depth-Teaching.pdf");
      setExportArtifact({ file: exportFile, kind: "pdf" });
      setExportStatus({
        kind: "pdf",
        tone: "success",
        message: "PDF ready — Download",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "PDF generation failed. Please try again.";
      console.error("PDF export failed", error);
      setWorkflowError(message);
      setExportStatus({
        kind: "pdf",
        tone: "error",
        message: "PDF generation failed. Please try again.",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  async function onShareExportArtifact() {
    if (!exportArtifact) return;

    try {
      await shareFileWithBrowser(exportArtifact.file);
      setExportStatus((prev) => prev ? {
        ...prev,
        tone: "success",
        message: `${exportArtifact.file.name} is ready to share from your browser or apps list.`,
      } : prev);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      const message = error instanceof Error ? error.message : "Unable to open share sheet.";
      console.error("Export share failed", error);
      setWorkflowError(message);
      setExportStatus((prev) => prev ? {
        ...prev,
        tone: "error",
        message: "Download could not be started. Please try again.",
      } : prev);
    }
  }

  async function onOpenExportArtifact() {
    if (!exportArtifact) return;

    try {
      await openFileInBrowser(exportArtifact.file);
      setExportStatus((prev) => prev ? {
        ...prev,
        tone: "success",
        message: `${exportArtifact.file.name} opened in a new browser tab or window.`,
      } : prev);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to open generated file.";
      console.error("Open export artifact failed", error);
      setWorkflowError(message);
    }
  }

  const activeCard = hasCards ? cards[activeCardIndex] : null;
  const sourceReady = sourceExtraction.extractionStage === "ready" || sourceExtraction.extractionStage === "needs-review";
  const step1Done = sourceReady;
  const step2Done = step1Done && teachingResponse.trim().length > 0;
  const step3Done = step2Done && !!masterImageUrl;
  const step4Done = step3Done && hasAnalysis;
  const step5Done = step4Done && hasCards;
  const step6Done = step5Done && !!activeCard;
  const step7Done = step6Done && !!exportArtifact;

  const stepStatuses = [
    {
      label: "STEP 1 SOURCE MATERIAL -> OCR/SOURCE EXTRACTION",
      done: step1Done,
    },
    { label: "STEP 2 EXTERNAL AI TEACHING RESPONSE", done: step2Done },
    { label: "STEP 3 CREATE MASTER TEACHING IMAGE", done: step3Done },
    { label: "STEP 4 MASTER IMAGE STRUCTURED UNDERSTANDING", done: step4Done },
    { label: "STEP 5 TOPIC DISINTEGRATION", done: step5Done },
    { label: "STEP 6 TEACHING DECK", done: step6Done },
    { label: "STEP 7 EXPORT", done: step7Done },
  ];

  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-elegant)] backdrop-blur md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Master Learning Image Workflow</div>
        <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground">Create -&gt; Import -&gt; Disintegrate</span>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-dashed border-border bg-background/40 p-3 text-xs text-foreground">
          <p className="font-semibold uppercase tracking-[0.15em] text-muted-foreground">Source Image Model</p>
          <p className="mt-2">SOURCE IMAGE -&gt; OCR / SOURCE EXTRACTION</p>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-background/40 p-3 text-xs text-foreground">
          <p className="font-semibold uppercase tracking-[0.15em] text-muted-foreground">Master Image Model</p>
          <p className="mt-2">MASTER TEACHING IMAGE -&gt; LOCAL STRUCTURED DISINTEGRATION</p>
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        {stepStatuses.map((step) => (
          <div key={step.label} className="rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-foreground">
            <span className={step.done ? "text-emerald-300" : "text-amber-200"}>{step.done ? "✓ Completed" : "○ Pending"}</span>
            <span className="ml-2">{step.label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-background/50 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">STEP 1 - Source Material and OCR/Source Extraction</div>

          <div className="mb-3 grid gap-2 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card/50 p-3 text-xs text-foreground">
              <div className="mb-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Attached source material</div>
              {sourceExtraction.sourceFiles.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5">
                  {sourceExtraction.sourceFiles.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No source files uploaded yet.</p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-3 text-xs text-foreground">
              <div className="mb-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Extracted educational structure</div>
              <p>Subject: {sourceExtraction.metadata.subject}</p>
              <p>Class/Grade: {sourceExtraction.metadata.classLevel}</p>
              <p>Board: {sourceExtraction.metadata.board}</p>
              <p>Chapter: {sourceExtraction.metadata.chapter}</p>
              <p>Topic: {sourceExtraction.metadata.topic}</p>
              <p>Question/Text Type: {sourceExtraction.metadata.questionType}</p>
              <p>Language: {sourceExtraction.metadata.language}</p>
              <p>Formula hits: {sourceExtraction.metadata.formulaCount}</p>
              <p>Diagram/image hints: {sourceExtraction.metadata.diagramCount}</p>
            </div>
          </div>

          <div className="mb-3 rounded-xl border border-border bg-card/50 px-3 py-2 text-xs">
            <span className="font-semibold text-foreground">OCR confidence: {sourceExtraction.confidenceLabel}</span>
            <p className={sourceExtraction.extractionStage === "needs-review" || sourceExtraction.extractionStage === "unavailable" ? "mt-1 text-amber-200" : "mt-1 text-muted-foreground"}>
              {sourceExtraction.confidenceNote}
            </p>
            {(sourceExtraction.extractionStage === "needs-review" || sourceExtraction.extractionStage === "unavailable") && (
              <p className="mt-1 text-[11px] text-amber-200">Verify and edit extracted text in the OCR section above before continuing.</p>
            )}
          </div>

          <textarea
            value={sourceExtraction.extractedText}
            readOnly
            placeholder="Extracted source text will appear here after OCR/source extraction."
            className="min-h-32 w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-xs text-foreground outline-none"
          />
        </div>

        <div className="rounded-2xl border border-border bg-background/50 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">STEP 2 - External AI Teaching Response</div>
          <textarea
            value={teachingResponse}
            onChange={(event) => setTeachingResponse(event.target.value)}
            placeholder="Paste the external AI teaching response here after prompt execution."
            className="min-h-32 w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none"
          />
        </div>

        <div className="rounded-2xl border border-border bg-background/50 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">STEP 3 - Create Master Teaching Image</div>
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCreateImageSpec}
              className="rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground"
            >
              Build Image Prompt
            </button>
            <button
              type="button"
              onClick={() => {
                if (!imageSpec.trim()) return;
                navigator.clipboard.writeText(imageSpec).catch(() => {
                  // Ignore clipboard failures.
                });
              }}
              disabled={!imageSpec.trim()}
              className="rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground disabled:opacity-50"
            >
              Copy Prompt for External Image Generation
            </button>
            <button
              type="button"
              onClick={() => void onGenerateTeachingImage()}
              disabled={!canGenerateImage || isGeneratingImage}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
            >
              {isGeneratingImage && <Loader2 size={14} className="animate-spin" />}
              <Sparkles size={15} />
              CREATE TEACHING IMAGE
            </button>
          </div>

          <textarea
            value={imageSpec}
            onChange={(event) => setImageSpec(event.target.value)}
            placeholder="Master learning image specification will appear here."
            className="min-h-36 w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-xs text-foreground outline-none"
          />
        </div>

        <div className="rounded-2xl border border-border bg-background/50 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">STEP 4 - Master Teaching Image</div>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDownloadMasterImage}
              disabled={!masterImageUrl}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground disabled:opacity-50"
            >
              <Download size={15} />
              DOWNLOAD IMAGE
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground"
            >
              <Upload size={15} />
              ATTACH / IMPORT IMAGE
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(event) => {
                void onImportImage(event);
              }}
            />
            <button
              type="button"
              onClick={() => void onRemoveImage()}
              disabled={!masterImageFile}
              className="rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground disabled:opacity-50"
            >
              REPLACE / REMOVE IMAGE
            </button>
          </div>

          {masterImageUrl && (
            <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
              <div className="rounded-xl border border-border bg-card/50 p-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">MASTER TEACHING IMAGE</div>
                <img src={masterImageUrl} alt="Master learning" className="max-h-[24rem] w-full rounded-lg object-contain" />
              </div>
              <div className="space-y-2 rounded-xl border border-border bg-card/50 p-3 text-sm text-foreground">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <FileImage size={13} />
                  Image Details
                </div>
                <p><span className="text-muted-foreground">Name:</span> {masterImageMeta?.name ?? "-"}</p>
                <p><span className="text-muted-foreground">Dimensions:</span> {masterImageMeta ? `${masterImageMeta.width} x ${masterImageMeta.height}` : "-"}</p>
                <p><span className="text-muted-foreground">Format:</span> {masterImageMeta?.mime ?? "-"}</p>
                <p><span className="text-muted-foreground">Size:</span> {masterImageMeta ? formatBytes(masterImageMeta.size) : "-"}</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-background/50 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">STEP 5 - Structured Understanding</div>
          <button
            type="button"
            onClick={() => void onAnalyzeImage()}
            disabled={!masterImageUrl || isAnalyzingImage}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
          >
            {isAnalyzingImage && <Loader2 size={14} className="animate-spin" />}
            ANALYSE MASTER IMAGE
          </button>

          {hasAnalysis && (
            <div className="mt-3 rounded-xl border border-border bg-card/50 p-3 text-sm text-foreground">
              <p className="font-semibold">Main Topic: {analysis.mainTopic || "Not identified"}</p>
              {analysis.sourceContent.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Source Content</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                    {analysis.sourceContent.slice(0, 4).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.additionalExamCoverage.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-amber-200">Important Additional Exam Coverage</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                    {analysis.additionalExamCoverage.slice(0, 5).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.subtopics.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Subtopics</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {analysis.subtopics.map((item) => (
                      <span key={item} className="rounded-full border border-border px-2 py-0.5 text-xs">{item}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-background/50 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">STEP 6 - Topic Disintegration</div>
          <button
            type="button"
            onClick={() => void onCreateTeachingCards()}
            disabled={!hasAnalysis || isCreatingCards}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
          >
            {isCreatingCards && <Loader2 size={14} className="animate-spin" />}
            DISINTEGRATE INTO TEACHING CARDS
          </button>
          {hasCards && (
            <p className="mt-2 text-sm text-emerald-200">Generated {cards.length} teaching cards in logical sequence.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-background/50 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">STEP 7 - Teaching Deck</div>
          {!activeCard && <p className="text-sm text-muted-foreground">Create teaching cards to open the deck.</p>}

          {activeCard && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-3 py-2">
                <span className="text-sm font-semibold text-foreground">Card {activeCardIndex + 1} of {cards.length}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCardIndex((prev) => Math.max(0, prev - 1))}
                    disabled={activeCardIndex === 0}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-foreground disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCardIndex((prev) => Math.min(cards.length - 1, prev + 1))}
                    disabled={activeCardIndex === cards.length - 1}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-foreground disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>

              <article className="rounded-xl border border-border bg-card/50 p-3">
                <h4 className="text-base font-semibold text-foreground">{activeCard.title}</h4>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{activeCard.explanation}</p>

                {activeCard.keyPoints.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Key Points</div>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
                      {activeCard.keyPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeCard.formula && <p className="mt-3 text-sm text-foreground"><span className="text-muted-foreground">Formula:</span> {activeCard.formula}</p>}
                {activeCard.diagram && <p className="mt-1 text-sm text-foreground"><span className="text-muted-foreground">Diagram:</span> {activeCard.diagram}</p>}
                {activeCard.example && <p className="mt-1 whitespace-pre-wrap text-sm text-foreground"><span className="text-muted-foreground">Example:</span> {activeCard.example}</p>}
                {activeCard.examImportance && <p className="mt-1 text-sm text-foreground"><span className="text-muted-foreground">Exam Importance:</span> {activeCard.examImportance}</p>}
                {activeCard.commonMistake && <p className="mt-1 text-sm text-foreground"><span className="text-muted-foreground">Common Mistake:</span> {activeCard.commonMistake}</p>}
              </article>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-background/50 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">STEP 8 - Export</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void onDownloadPdf()}
              disabled={!hasCards || isDownloadingPdf}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
            >
              {isDownloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {isDownloadingPdf ? "GENERATING PDF..." : "DOWNLOAD TEACHING PDF"}
            </button>
            <button
              type="button"
              onClick={() => void onDownloadCards()}
              disabled={!hasCards || isDownloadingCard}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
            >
              {isDownloadingCard ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {isDownloadingCard ? "GENERATING TEACHING CARDS..." : "DOWNLOAD TEACHING CARDS"}
            </button>
          </div>

          {exportStatus && (
            <div
              className={`mt-3 rounded-xl border px-3 py-3 text-sm break-words ${
                exportStatus.tone === "error"
                  ? "border-red-500/40 bg-red-500/10 text-red-100"
                  : exportStatus.tone === "loading"
                    ? "border-border bg-card/60 text-muted-foreground"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
              }`}
            >
              <div className="font-medium">{exportStatus.message}</div>
              {exportArtifact && exportStatus.tone === "success" && (
                <div className="mt-2 text-xs">
                  <div>File: {exportArtifact.file.name}</div>
                  <div>MIME type: {exportArtifact.file.type}</div>
                  <div>Size: {formatBytes(exportArtifact.file.size)}</div>
                </div>
              )}
            </div>
          )}

          {exportArtifact && exportStatus?.tone === "success" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowDownloadHelp((prev) => !prev)}
                className="rounded-xl border border-border bg-card/70 px-3 py-2 text-xs font-semibold text-foreground"
              >
                How to find the file
              </button>
              <button
                type="button"
                onClick={() => void onOpenExportArtifact()}
                className="rounded-xl border border-border bg-card/70 px-3 py-2 text-xs font-semibold text-foreground"
              >
                Open file
              </button>
              {canShareExport && (
                <button
                  type="button"
                  onClick={() => void onShareExportArtifact()}
                  className="rounded-xl border border-border bg-card/70 px-3 py-2 text-xs font-semibold text-foreground"
                >
                  Save / Share
                </button>
              )}
            </div>
          )}

          {showDownloadHelp && exportArtifact && (
            <div className="mt-3 rounded-xl border border-border bg-card/60 px-3 py-3 text-xs text-foreground">
              <div className="font-semibold">How to find the file</div>
              <p className="mt-1">Open your phone's Files app -&gt; Downloads.</p>
              <p className="mt-1">You can also check your browser menu -&gt; Downloads for {exportArtifact.file.name}.</p>
            </div>
          )}
        </div>

        {workflowError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {workflowError}
          </div>
        )}

        {workflowNotice && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {workflowNotice}
          </div>
        )}
      </div>
    </section>
  );
}
