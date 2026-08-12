import type { ExtractedContent, FormulaExtraction } from "@/types/teaching-engine";

const UNKNOWN = "Unknown";
const NOT_IDENTIFIED = "Not identified";
const MIN_CONFIDENCE = 0.6;

type SubjectKey = "Physics" | "Biology" | "Chemistry" | "History" | "Geography" | "Mathematics" | "English";

type TopicRule = {
  topic: string;
  chapter: string;
  concept?: string;
  aliases: string[];
};

type SubjectRule = {
  aliases: string[];
  keywords: string[];
  topics: TopicRule[];
};

const SUBJECT_RULES: Record<SubjectKey, SubjectRule> = {
  Physics: {
    aliases: ["physics"],
    keywords: [
      "ohm", "current", "voltage", "resistance", "electricity", "circuit", "v = i", "v=ir", "power", "motion", "force",
      "object", "image", "mirror", "spherical mirror", "concave", "convex", "focus", "focal", "pole", "principal axis",
      "centre of curvature", "center of curvature", "radius of curvature", "mirror formula", "magnification", "ray diagram",
    ],
    topics: [
      { topic: "Ohm's Law", chapter: "Electricity", aliases: ["ohm", "ohm's law", "v = ir", "v=ir", "resistance", "current", "voltage"] },
      { topic: "Electric Circuit", chapter: "Electricity", aliases: ["circuit", "series circuit", "parallel circuit"] },
      { topic: "Motion", chapter: "Motion", aliases: ["velocity", "acceleration", "displacement", "motion"] },
      {
        topic: "Light / Spherical Mirrors",
        chapter: "Light - Reflection and Refraction",
        concept: "Concave/Convex Mirror",
        aliases: [
          "spherical mirror", "concave", "convex", "focus", "focal length", "centre of curvature", "center of curvature",
          "principal axis", "pole", "mirror formula", "magnification", "ray diagram", "object distance", "image distance",
        ],
      },
    ],
  },
  Biology: {
    aliases: ["biology"],
    keywords: ["photosynthesis", "chlorophyll", "carbon dioxide", "glucose", "oxygen", "cell", "respiration", "organ"],
    topics: [
      { topic: "Photosynthesis", chapter: "Life Processes", aliases: ["photosynthesis", "chlorophyll", "glucose", "carbon dioxide"] },
      { topic: "Respiration", chapter: "Life Processes", aliases: ["respiration", "breathing", "oxygen", "mitochondria"] },
      { topic: "Cell Structure", chapter: "Cell", aliases: ["cell", "nucleus", "cytoplasm", "cell wall"] },
    ],
  },
  Chemistry: {
    aliases: ["chemistry"],
    keywords: ["chemical", "equation", "mole", "acid", "base", "salt", "reaction", "oxidation", "reduction"],
    topics: [
      { topic: "Chemical Reactions", chapter: "Chemical Reactions and Equations", aliases: ["chemical reaction", "equation", "product", "reactant"] },
      { topic: "Acids, Bases and Salts", chapter: "Acids, Bases and Salts", aliases: ["acid", "base", "salt", "ph"] },
      { topic: "Mole Concept", chapter: "Some Basic Concepts of Chemistry", aliases: ["mole", "avogadro", "molar"] },
    ],
  },
  History: {
    aliases: ["history"],
    keywords: ["first world war", "world war", "independence", "revolution", "treaty", "empire", "colonial"],
    topics: [
      { topic: "First World War", chapter: "World Wars", aliases: ["first world war", "world war i", "ww1", "treaty of versailles"] },
      { topic: "Indian Independence", chapter: "Nationalism in India", aliases: ["independence", "freedom struggle", "national movement"] },
    ],
  },
  Geography: {
    aliases: ["geography"],
    keywords: ["water cycle", "climate", "river", "mountain", "rainfall", "monsoon", "soil", "resources"],
    topics: [
      { topic: "Water Cycle", chapter: "Water Cycle", aliases: ["water cycle", "evaporation", "condensation", "precipitation"] },
      { topic: "Climate", chapter: "Climate", aliases: ["climate", "rainfall", "monsoon", "temperature"] },
      { topic: "Water Resources", chapter: "Water Resources", aliases: ["water resources", "river basin", "groundwater"] },
    ],
  },
  Mathematics: {
    aliases: ["mathematics", "math", "maths"],
    keywords: ["equation", "algebra", "triangle", "geometry", "quadratic", "ratio", "theorem"],
    topics: [
      { topic: "Algebra", chapter: "Algebra", aliases: ["equation", "polynomial", "quadratic", "algebra"] },
      { topic: "Geometry", chapter: "Geometry", aliases: ["triangle", "circle", "theorem", "angle", "geometry"] },
    ],
  },
  English: {
    aliases: ["english"],
    keywords: ["grammar", "tense", "comprehension", "essay", "poem", "letter", "passage"],
    topics: [
      { topic: "Grammar", chapter: "Grammar", aliases: ["grammar", "tense", "voice", "speech"] },
      { topic: "Reading Comprehension", chapter: "Comprehension", aliases: ["comprehension", "passage", "read and answer"] },
    ],
  },
};

const GENERIC_CHAPTER_WORDS = new Set(["equation", "formula", "diagram", "question", "chapter", "topic", "test"]);

const UI_NOISE_PATTERNS = [
  /reply to chatgpt/i,
  /share a link to chat/i,
  /^hi$/i,
  /^hey$/i,
  /^chatgpt$/i,
  /^new chat$/i,
  /battery/i,
  /^\d{1,2}:\d{2}(\s?[ap]m)?$/i,
  /^\d{1,3}%$/,
  /status/i,
  /send message/i,
  /type a message/i,
  /chat controls?/i,
  /device indicators?/i,
  /wifi/i,
  /network/i,
];

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your", "their", "there", "what", "when", "where", "which", "why",
  "find", "solve", "state", "write", "show", "explain", "derive", "calculate", "class", "chapter", "topic", "question", "board", "test",
  "of", "in", "to", "a", "an", "is", "are", "was", "were", "be", "or", "if", "then", "it", "as", "at", "on", "by", "we", "you",
]);

function clamp(value: number, min = 0, max = 0.99) {
  return Math.max(min, Math.min(max, value));
}

function normalize(text: string) {
  return text.toLowerCase();
}

function cleanLine(line: string) {
  return line.replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, " ").replace(/\s+/g, " ").trim();
}

function isUiNoise(line: string) {
  if (!line) return true;
  if (/^[^a-zA-Z0-9]+$/.test(line)) return true;
  return UI_NOISE_PATTERNS.some((pattern) => pattern.test(line));
}

export function sanitizeOcrText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((line) => !isUiNoise(line));

  return lines.join("\n").trim();
}

function normalizeOcrForAnalysis(text: string) {
  // Preserve formulas and numeric tokens while fixing common OCR confusions in key academic terms.
  const lines = text.split(/\r?\n/).map((line) =>
    line
      .replace(/\bc[0o]ncave\b/gi, "concave")
      .replace(/\bc[0o]nvex\b/gi, "convex")
      .replace(/\bf[0o]cus\b/gi, "focus")
      .replace(/\bpo1e\b/gi, "pole")
      .replace(/\b0bject\b/gi, "object")
      .replace(/\b1mage\b/gi, "image")
      .replace(/\breflecti[0o]n\b/gi, "reflection")
      .replace(/\bcurvatu[rn]e\b/gi, "curvature")
      .replace(/\bcent[er]{2}\s+of\s+curvature\b/gi, "centre of curvature")
      .replace(/\bcenter\s+of\s+curvature\b/gi, "centre of curvature")
      .replace(/\bprincipal\s+a[xk]is\b/gi, "principal axis")
      .replace(/[ \t]+/g, " ")
      .trim(),
  );

  return lines.filter(Boolean).join("\n");
}

function isBoundaryLine(line: string) {
  const lower = normalize(line);
  if (/^(test|question|q)\s*\d+/i.test(line)) return true;
  if (/^\d+[).:-]\s*/.test(line)) return true;
  if (/\b(test|question)\s*\d+\b/.test(lower)) return true;
  if (/^(physics|biology|chemistry|history|geography|mathematics|math|english)\b/i.test(line)) return true;
  if (line.includes(" - ")) {
    return /\b(physics|biology|chemistry|history|geography|mathematics|math|english)\b/i.test(line);
  }
  return false;
}

function splitIntoQuestionBlocks(text: string) {
  const cleaned = sanitizeOcrText(text);
  if (!cleaned) return [] as string[];

  const lines = cleaned.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (isBoundaryLine(line) && current.length > 0) {
      blocks.push(current.join("\n").trim());
      current = [line];
      continue;
    }
    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(current.join("\n").trim());
  }

  const compact = blocks.filter((block) => block.length > 0);
  if (compact.length === 0) return [cleaned];

  return compact;
}

function keywordHits(text: string, keywords: string[]) {
  const lower = normalize(text);
  let score = 0;

  for (const keyword of keywords) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = keyword.includes(" ")
      ? new RegExp(`\\b${escaped}\\b`, "i")
      : new RegExp(`\\b${escaped}\\b`, "i");

    if (pattern.test(lower)) {
      score += keyword.includes(" ") ? 2 : 1;
    }
  }

  return score;
}

function detectSubject(segment: string) {
  const lower = normalize(segment);
  const scores = Object.entries(SUBJECT_RULES).map(([subject, rule]) => {
    const explicit = rule.aliases.some((alias) => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i").test(segment));
    const keywordScore = keywordHits(lower, rule.keywords);
    const topicScore = rule.topics.reduce((acc, topic) => acc + keywordHits(lower, topic.aliases), 0);
    const total = (explicit ? 4 : 0) + keywordScore + topicScore;
    return { subject, score: total };
  });

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const second = scores[1] ?? { subject: "", score: 0 };

  if (!top || top.score <= 0) {
    return { subject: UNKNOWN, confidence: 0.2 };
  }

  if (top.score < 2) {
    return { subject: UNKNOWN, confidence: 0.45 };
  }

  const margin = top.score - second.score;
  const confidence = clamp(0.55 + top.score * 0.04 + margin * 0.08);
  const label = confidence >= MIN_CONFIDENCE ? top.subject : UNKNOWN;

  return { subject: label, confidence };
}

function detectBoard(text: string) {
  const lower = normalize(text);
  if (lower.includes("cbse")) return { value: "CBSE", confidence: 0.96 };
  if (lower.includes("icse")) return { value: "ICSE", confidence: 0.96 };
  if (lower.includes("igcse")) return { value: "IGCSE", confidence: 0.96 };
  if (lower.includes("state board") || /\bssc\b/.test(lower)) return { value: "State Board", confidence: 0.84 };
  return { value: NOT_IDENTIFIED, confidence: 0.28 };
}

function detectClassLevel(text: string) {
  const match = text.match(/\b(?:class|grade|std)\s*([6-9]|10|11|12)\b/i);
  if (match?.[1]) return { value: `Class ${match[1]}`, confidence: 0.95 };
  return { value: NOT_IDENTIFIED, confidence: 0.3 };
}

function detectTopicAndChapter(segment: string, subject: string) {
  const explicitTopic = segment.match(/\btopic\s*[:\-]?\s*([^\n.]+)/i)?.[1]?.trim();
  const explicitChapter = segment.match(/\bchapter\s*[:\-]?\s*([^\n.]+)/i)?.[1]?.trim();
  const lower = normalize(segment);

  const mirrorConcept = (() => {
    const hasConcave = /\bconcave\b/.test(lower);
    const hasConvex = /\bconvex\b/.test(lower);
    if (hasConcave && hasConvex) return "Concave/Convex Mirror";
    if (hasConcave) return "Concave Mirror";
    if (hasConvex) return "Convex Mirror";
    return undefined;
  })();

  const validExplicitChapter = explicitChapter && !GENERIC_CHAPTER_WORDS.has(explicitChapter.toLowerCase())
    ? explicitChapter
    : undefined;

  if (explicitTopic) {
    if (subject !== UNKNOWN && subject in SUBJECT_RULES) {
      const subjectRule = SUBJECT_RULES[subject as SubjectKey];
      const explicitLower = normalize(explicitTopic);
      const topicRule = subjectRule.topics.find((candidate) =>
        candidate.aliases.some((alias) => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(explicitLower)) ||
        candidate.topic.toLowerCase() === explicitLower,
      );

      if (topicRule) {
        return {
          topic: topicRule.topic,
          chapter: validExplicitChapter ?? topicRule.chapter,
          concept: mirrorConcept ?? topicRule.concept ?? UNKNOWN,
          topicConfidence: 0.92,
          chapterConfidence: validExplicitChapter ? 0.86 : 0.84,
          conceptConfidence: mirrorConcept ? 0.9 : topicRule.concept ? 0.78 : 0.3,
        };
      }
    }

    return {
      topic: explicitTopic,
      chapter: validExplicitChapter ?? UNKNOWN,
      concept: mirrorConcept ?? UNKNOWN,
      topicConfidence: 0.92,
      chapterConfidence: validExplicitChapter ? 0.86 : 0.45,
      conceptConfidence: mirrorConcept ? 0.86 : 0.3,
    };
  }

  if (subject !== UNKNOWN && subject in SUBJECT_RULES) {
    const subjectRule = SUBJECT_RULES[subject as SubjectKey];
    const candidates = subjectRule.topics
      .map((topicRule) => ({
        topicRule,
        score: keywordHits(lower, topicRule.aliases),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const winner = candidates[0];
      return {
        topic: winner.topicRule.topic,
        chapter: validExplicitChapter ?? winner.topicRule.chapter,
        concept: mirrorConcept ?? winner.topicRule.concept ?? UNKNOWN,
        topicConfidence: clamp(0.74 + winner.score * 0.05),
        chapterConfidence: validExplicitChapter ? 0.86 : clamp(0.72 + winner.score * 0.05),
        conceptConfidence: mirrorConcept ? 0.88 : winner.topicRule.concept ? 0.76 : 0.3,
      };
    }
  }

  const dashed = segment.split(/\s[-–:]\s/).map((part) => part.trim()).filter(Boolean);
  if (dashed.length >= 2) {
    const tail = dashed[dashed.length - 1];
    if (tail.length > 3) {
      return {
        topic: tail,
        chapter: validExplicitChapter ?? UNKNOWN,
        concept: mirrorConcept ?? UNKNOWN,
        topicConfidence: 0.66,
        chapterConfidence: validExplicitChapter ? 0.86 : 0.45,
        conceptConfidence: mirrorConcept ? 0.84 : 0.3,
      };
    }
  }

  return {
    topic: UNKNOWN,
    chapter: validExplicitChapter ?? UNKNOWN,
    concept: mirrorConcept ?? UNKNOWN,
    topicConfidence: 0.3,
    chapterConfidence: validExplicitChapter ? 0.86 : 0.3,
    conceptConfidence: mirrorConcept ? 0.8 : 0.3,
  };
}

function detectQuestionType(segment: string) {
  const lower = normalize(segment);

  const ranked: Array<{ value: string; confidence: number; pattern: RegExp }> = [
    { value: "Exam Question", confidence: 0.92, pattern: /\b(board question|past paper|exam question|sample paper)\b/ },
    { value: "MCQ/Objective", confidence: 0.95, pattern: /\b(mcq|multiple choice|true\s*or\s*false|objective|choose the correct)\b/ },
    { value: "Derivation", confidence: 0.93, pattern: /\b(derive|proof|prove|show that)\b/ },
    { value: "Numerical/Problem", confidence: 0.93, pattern: /\b(calculate|find|compute|evaluate|determine)\b/ },
    { value: "Diagram-based", confidence: 0.9, pattern: /\b(draw|label|sketch|diagram|plot|ray diagram)\b/ },
    { value: "Comparison", confidence: 0.88, pattern: /\b(compare|differentiate|distinguish|contrast)\b/ },
    { value: "Application", confidence: 0.86, pattern: /\b(application|real life|uses|apply)\b/ },
    { value: "Concept Explanation", confidence: 0.86, pattern: /\b(explain|describe|discuss|why|how)\b/ },
    { value: "Definition", confidence: 0.82, pattern: /\b(state|define|name|list|what is)\b/ },
  ];

  const hit = ranked.find((item) => item.pattern.test(lower));
  if (hit) return { value: hit.value, confidence: hit.confidence };

  return { value: UNKNOWN, confidence: 0.35 };
}

function detectQuestionTypes(segment: string) {
  const lower = normalize(segment);
  const types = new Set<string>();

  if (/\b(mcq|multiple choice|true\s*or\s*false|objective|choose the correct)\b/.test(lower)) {
    types.add("MCQ/Objective");
  }

  if (/\b(calculate|find|compute|evaluate|determine)\b/.test(lower)) {
    types.add("Numerical/Problem");
  }

  if (/\b(draw|label|sketch|diagram|plot|ray diagram)\b/.test(lower)) {
    types.add("Diagram-based");
  }

  if (/\b(explain|describe|discuss|why|how)\b/.test(lower)) {
    types.add("Concept Explanation");
  }

  if (/\b(state|define|name|list|what is)\b/.test(lower)) {
    types.add("Definition");
  }

  if (/\b(derive|proof|prove|show that)\b/.test(lower)) {
    types.add("Derivation");
  }

  if (/\b(compare|differentiate|distinguish|contrast)\b/.test(lower)) {
    types.add("Comparison");
  }

  if (/\b(application|real life|uses|apply)\b/.test(lower)) {
    types.add("Application");
  }

  if (/\b(short answer|\b2 marks?\b)\b/.test(lower)) {
    types.add("Short Answer");
  }

  if (/\b(long answer|\b5 marks?\b|\b8 marks?\b)\b/.test(lower)) {
    types.add("Long Answer");
  }

  if (/\b(board question|past paper|exam question|sample paper)\b/.test(lower)) {
    types.add("Exam Question");
  }

  if (types.size === 0) {
    types.add(UNKNOWN);
  }

  return Array.from(types);
}

function detectLanguage(text: string) {
  if (/[\u0900-\u097F]/.test(text)) {
    const lower = normalize(text);
    if (/\bआहे\b|\bम्हणजे\b|\bकाय\b/.test(lower)) {
      return { value: "Marathi", confidence: 0.8 };
    }
    return { value: "Hindi", confidence: 0.78 };
  }

  return { value: "English", confidence: 0.7 };
}

function detectHasTables(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const tableLikeLineCount = lines.filter((line) => /\|/.test(line) || /\t/.test(line)).length;
  const columnLineCount = lines.filter((line) => /\b\w+\s{2,}\w+\s{2,}\w+/.test(line)).length;
  return tableLikeLineCount >= 1 || columnLineCount >= 2;
}

function detectHasExercises(text: string) {
  return /\b(exercise|worksheet|practice set|assignment|homework|q\.?\s*\d+)\b/i.test(text);
}

function detectExamImportance(text: string) {
  const lower = normalize(text);
  const hasPastPaperCount =
    /(\bpast\s*papers?\b[^\n.]{0,40}\b\d+\s*(times?|x)\b)|(\b\d+\s*(times?|x)\b[^\n.]{0,40}\bpast\s*papers?\b)/i.test(lower);

  if (hasPastPaperCount) {
    return "Past-paper frequency referenced in source text.";
  }

  return "Past-paper frequency unavailable.";
}

function normalizeFormulaText(rawFormula: string) {
  let normalized = rawFormula
    .replace(/[|]/g, "1")
    .replace(/[—–]/g, "-")
    .replace(/[×]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  normalized = normalized
    .replace(/\b([Il])\s*\/(?=[fuvm]\b)/g, "1/")
    .replace(/\b([1])\s*\/\s*([fuvm])\b/gi, "1/$2")
    .replace(/\b([fuvm])\s*=\s*([fuvm])\s*\/\s*([fuvm])\b/gi, "$1 = $2/$3")
    .replace(/\b([fuvm])\s*=\s*([fuvm])\s*\+\s*([fuvm])\b/gi, "$1 = $2 + $3");

  return normalized;
}

function scoreFormulaConfidence(raw: string, normalized: string) {
  if (!normalized) return 0.2;

  const hasEquality = /=/.test(normalized);
  const hasMathOp = /[+\-*/^]/.test(normalized);
  const hasMathTokens = /\b(f|u|v|m|i|r|p|h|a|b|c|d)\b/i.test(normalized);
  const changed = raw.trim() !== normalized.trim();

  let confidence = 0.45;
  if (hasEquality) confidence += 0.22;
  if (hasMathOp) confidence += 0.16;
  if (hasMathTokens) confidence += 0.12;
  if (changed) confidence += 0.08;

  return clamp(confidence, 0.2, 0.98);
}

function extractFormulaCandidates(segment: string) {
  const lines = segment.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const candidates = new Set<string>();

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    const lower = line.toLowerCase();
    const isFormulaLike =
      /([A-Za-z][A-Za-z0-9_]*\s*=\s*[^=].*|\b\d+\s*\/\s*[A-Za-z]\b|\b[A-Za-z]+\s*\+\s*[A-Za-z]+\s*(->|→)\s*[A-Za-z]+|\bV\s*=\s*I\s*R\b)/i.test(line) ||
      /\b(mirror formula|magnification|focal length)\b/i.test(lower);

    if (isFormulaLike) {
      candidates.add(line);
      continue;
    }

    if (/^[fuvm]$/i.test(line)) {
      const prev = lines[idx - 1] ?? "";
      const next = lines[idx + 1] ?? "";
      if (/^[fuvm]$/i.test(prev) || /^[fuvm]$/i.test(next) || /=|\//.test(next) || /=|\//.test(prev)) {
        candidates.add(line);
      }
    }
  }

  const merged = lines.join(" ");
  const inlineMirror = merged.match(/([1I|l]\s*\/\s*[fuvm]\s*=\s*[1I|l]\s*\/\s*[fuvm]\s*[+\-]\s*[1I|l]\s*\/\s*[fuvm])/i);
  if (inlineMirror?.[1]) {
    candidates.add(inlineMirror[1]);
  }

  return Array.from(candidates);
}

function extractFormulaeDetailed(segment: string): FormulaExtraction[] {
  const candidates = extractFormulaCandidates(segment);
  const details = candidates.map((raw) => {
    const normalized = normalizeFormulaText(raw);
    const confidence = scoreFormulaConfidence(raw, normalized);
    return {
      raw,
      normalized,
      confidence,
    } satisfies FormulaExtraction;
  });

  const deduped = new Map<string, FormulaExtraction>();
  for (const item of details) {
    const key = item.normalized.toLowerCase();
    const current = deduped.get(key);
    if (!current || item.confidence > current.confidence) {
      deduped.set(key, item);
    }
  }

  return Array.from(deduped.values()).filter((item) => item.normalized.length > 0);
}

function extractNumericalQuestions(segment: string) {
  return segment
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\d/.test(line) && /\b(calculate|find|solve|evaluate|determine|what is|compute)\b/i.test(line));
}

function extractDiagramPrompts(segment: string) {
  return segment
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\b(diagram|figure|graph|circuit|flowchart|draw|label|sketch|plot)\b/i.test(line));
}

function extractKeywords(segment: string) {
  const tokens = segment
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([token]) => token);
}

function enforceConfidence(value: string | undefined, confidence: number) {
  if (!value) return UNKNOWN;
  return confidence >= MIN_CONFIDENCE ? value : UNKNOWN;
}

export function extractAcademicQuestions(rawText: string): ExtractedContent[] {
  const cleaned = sanitizeOcrText(rawText);
  if (!cleaned) {
    return [];
  }

  const cleanedForAnalysis = normalizeOcrForAnalysis(cleaned);

  const boardGuess = detectBoard(cleanedForAnalysis);
  const classGuess = detectClassLevel(cleanedForAnalysis);
  const languageGuess = detectLanguage(cleanedForAnalysis);
  const hasTables = detectHasTables(cleanedForAnalysis);
  const hasExercises = detectHasExercises(cleanedForAnalysis);
  const examImportance = detectExamImportance(cleanedForAnalysis);
  const blocks = splitIntoQuestionBlocks(cleanedForAnalysis);
  const cleanedFormulaDetails = extractFormulaeDetailed(cleanedForAnalysis);

  const questions = blocks.map((block) => {
    const subjectGuess = detectSubject(block);
    const topicAndChapter = detectTopicAndChapter(block, subjectGuess.subject);
    const questionType = detectQuestionType(block);
    const questionTypes = detectQuestionTypes(block);
    const formulaDetails = extractFormulaeDetailed(block);
    const normalizedFormulae = formulaDetails
      .filter((item) => item.confidence >= 0.6)
      .map((item) => item.normalized);

    return {
      ocrText: block,
      cleanedOcrText: block,
      subject: enforceConfidence(subjectGuess.subject, subjectGuess.confidence),
      board: boardGuess.value,
      classLevel: classGuess.value,
      chapter: enforceConfidence(topicAndChapter.chapter, topicAndChapter.chapterConfidence),
      topic: enforceConfidence(topicAndChapter.topic, topicAndChapter.topicConfidence),
      concept: enforceConfidence(topicAndChapter.concept, topicAndChapter.conceptConfidence),
      questionType: enforceConfidence(questionType.value, questionType.confidence),
      questionTypes,
      language: enforceConfidence(languageGuess.value, languageGuess.confidence),
      hasTables,
      hasExercises,
      examImportance,
      formulae: normalizedFormulae,
      formulaDetails,
      numericalQuestions: extractNumericalQuestions(block),
      diagrams: extractDiagramPrompts(block),
      keywords: extractKeywords(block),
      confidence: {
        subject: subjectGuess.confidence,
        board: boardGuess.confidence,
        classLevel: classGuess.confidence,
        chapter: topicAndChapter.chapterConfidence,
        topic: topicAndChapter.topicConfidence,
        concept: topicAndChapter.conceptConfidence,
        questionType: questionType.confidence,
        language: languageGuess.confidence,
      },
    } satisfies ExtractedContent;
  });

  return questions.length > 0
    ? questions
    : [
        {
          ocrText: cleaned,
          cleanedOcrText: cleanedForAnalysis,
          subject: UNKNOWN,
          board: boardGuess.value,
          classLevel: classGuess.value,
          chapter: UNKNOWN,
          topic: UNKNOWN,
          concept: UNKNOWN,
          questionType: UNKNOWN,
          questionTypes: [UNKNOWN],
          language: enforceConfidence(languageGuess.value, languageGuess.confidence),
          hasTables,
          hasExercises,
          examImportance,
          formulae: cleanedFormulaDetails
            .filter((item) => item.confidence >= 0.6)
            .map((item) => item.normalized),
          formulaDetails: cleanedFormulaDetails,
          numericalQuestions: extractNumericalQuestions(cleaned),
          diagrams: extractDiagramPrompts(cleaned),
          keywords: extractKeywords(cleaned),
          confidence: {
            subject: 0.2,
            board: boardGuess.confidence,
            classLevel: classGuess.confidence,
            chapter: 0.2,
            topic: 0.2,
            concept: 0.2,
            questionType: 0.35,
            language: languageGuess.confidence,
          },
        },
      ];
}
