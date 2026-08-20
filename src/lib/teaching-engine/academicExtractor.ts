import type { ExtractedContent, FormulaExtraction } from "@/types/teaching-engine";
import {
  filterRelevantFormulaeByContext,
  isUiOrAppArtifactLine,
  sanitizeEducationalText,
} from "@/lib/teaching-engine/contentIntegrity";

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
      { topic: "Motion", chapter: "Motion", aliases: ["velocity", "acceleration", "displacement", "motion", "speed", "average speed", "distance", "km/h", "m/s", "kinematic", "uniform motion", "non-uniform motion"] },
      {
        topic: "Light / Spherical Mirrors",
        chapter: "Light - Reflection and Refraction",
        concept: "Concave/Convex Mirror",
        aliases: [
          "spherical mirror", "spherical mirrors", "concave", "convex", "focus", "focal length", "centre of curvature", "center of curvature",
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
  /share (this )?(chat|link)/i,
  /this creates a copy that others can chat with/i,
  /others can chat with/i,
  /select only/i,
  /copy link/i,
  /tap to retry/i,
  /view all/i,
  /see all/i,
  /ask anything/i,
  /^hi$/i,
  /^hey$/i,
  /^chatgpt$/i,
  /^new chat$/i,
  /^today$/i,
  /battery/i,
  /^\d{1,2}:\d{2}(\s?[ap]m)?$/i,
  /^\d{1,2}:\d{2}\s*[ap]m$/i,
  /^\d{1,3}%$/,
  /^\d+\s*devices?\b/i,
  /^\d{1,2}:\d{2}\s*\(.+\)$/i,
  /\b(?:4g|5g|lte|volte|wi-?fi|signal|airplane mode)\b/i,
  /\bnet::err_name_not_resolved\b/i,
  /\bdns_probe_finished_nxdomain\b/i,
  /^\d+\/\d+$/,
  /\b(?:png|jpg|jpeg|webp|gif|pdf|docx?|pptx?)\b/i,
  /\bfilename\b/i,
  /status/i,
  /send message/i,
  /type a message/i,
  /chat controls?/i,
  /device indicators?/i,
  /wifi/i,
  /network/i,
  /navigation/i,
  /back$/i,
  /search$/i,
  /message$/i,
  /notifications?/i,
  /home$/i,
  /edit$/i,
  /copy$/i,
  /share$/i,
  /more$/i,
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
  if (isUiOrAppArtifactLine(line)) return true;
  if (/^[^a-zA-Z0-9]+$/.test(line)) return true;
  return UI_NOISE_PATTERNS.some((pattern) => pattern.test(line));
}

function isUiChromeLine(line: string) {
  if (!line) return true;
  if (isUiNoise(line)) return true;
  if (/^(reply|share|copy|select|search|back|home|menu|send|message|edit|delete|save)\b/i.test(line)) return true;
  if (/\b(chatgpt|status bar|notification|swipe|tap|click|button|link|copy that others can chat with)\b/i.test(line)) return true;
  return false;
}

function allAcademicKeywords() {
  const keywords = new Set<string>();

  for (const rule of Object.values(SUBJECT_RULES)) {
    for (const alias of rule.aliases) keywords.add(alias);
    for (const keyword of rule.keywords) keywords.add(keyword);
    for (const topic of rule.topics) {
      keywords.add(topic.topic);
      keywords.add(topic.chapter);
      if (topic.concept) keywords.add(topic.concept);
      for (const alias of topic.aliases) keywords.add(alias);
    }
  }

  return Array.from(keywords);
}

const ACADEMIC_KEYWORDS = allAcademicKeywords();

function scoreAcademicLine(line: string) {
  const lower = normalize(line);
  let score = 0;

  if (!lower.trim()) return -10;
  if (isUiChromeLine(line)) return -10;

  if (/\b(subject|board|class|grade|std|chapter|topic|exercise|question|example|solution|answer|given|formula|therefore|proof|theorem|definition|explain|derive|calculate|find|solve|evaluate|determine|diagram|label|table|figure|numerical|worksheet|assignment|homework|revision|important terms?)\b/i.test(line)) {
    score += 3;
  }

  if (/\b(cbse|icse|igcse|state board)\b/i.test(line)) {
    score += 2;
  }

  if (/\b\d+\s*(?:cm|mm|m|km|kg|g|mg|s|min|hr|v|a|ohm|w|n|pa|j|kwh|%)\b/i.test(line)) {
    score += 2;
  }

  if (/(?:[A-Za-z][A-Za-z0-9_]*\s*=\s*[^=].+|\b\d+\s*\/\s*[A-Za-z]\b|\b[A-Za-z]+\s*[+\-*/^]\s*[A-Za-z0-9]+|\bV\s*=\s*I\s*R\b)/i.test(line)) {
    score += 3;
  }

  if (/^(?:\d+[).:-]\s*)?(concave|convex|mirror|pole|focus|principal focus|focal length|radius of curvature|centre of curvature|center of curvature|object|image)\b/i.test(line)) {
    score += 2;
  }

  score += Math.min(4, keywordHits(lower, ACADEMIC_KEYWORDS));

  if (/^[A-Z][A-Z\s\-/:&]+$/.test(line) && /[A-Z]{3,}/.test(line)) {
    score += 1;
  }

  return score;
}

function extractAcademicQuestionLines(segment: string) {
  const lines = segment.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const matches = lines.filter((line) => looksLikeQuestionText(line));
  return deduplicateBlocks(matches);
}

function partitionAcademicContent(rawText: string) {
  const lines = rawText.split(/\r?\n/).map(cleanLine);
  const baseKinds = lines.map((line) => {
    if (!line) return "blank" as const;
    if (isUiChromeLine(line)) return "ignored" as const;
    return scoreAcademicLine(line) >= 2 ? "academic" as const : "undetermined" as const;
  });

  const academicLines: string[] = [];
  const ignoredLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const kind = baseKinds[index];

    if (!line || kind === "blank") continue;
    if (kind === "ignored") {
      ignoredLines.push(line);
      continue;
    }

    if (kind === "academic") {
      academicLines.push(line);
      continue;
    }

    const prevAcademic = baseKinds.slice(Math.max(0, index - 2), index).includes("academic");
    const nextAcademic = baseKinds.slice(index + 1, Math.min(baseKinds.length, index + 3)).includes("academic");

    if ((prevAcademic || nextAcademic) && !isUiChromeLine(line)) {
      academicLines.push(line);
    } else {
      ignoredLines.push(line);
    }
  }

  return {
    academicText: academicLines.join("\n").trim(),
    ignoredLines: deduplicateBlocks(ignoredLines),
  };
}

export function sanitizeOcrText(text: string) {
  return sanitizeEducationalText(text);
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

function isConceptLabelOnly(text: string) {
  const trimmed = normalize(text).trim();
  if (!trimmed) return false;

  const actionWords = /\b(find|calculate|solve|evaluate|determine|compute|derive|prove|show|explain|describe|compare|differentiate|distinguish|state|define|name|list|draw|label|sketch|identify|classify|write|convert|why|how|what is|which of)\b/i;
  if (actionWords.test(trimmed)) return false;

  if (/^(concave|convex|mirror|pole|focus|centre of curvature|center of curvature|radius of curvature|focal length|principal axis|object|image|formula|example|important terms|quick revision|common mistake|definition|topic|chapter|heading|note)\b/i.test(trimmed)) {
    return true;
  }

  return /\b(concave|convex|mirror|pole|focus|centre|center|curvature|radius|focal length|principal axis|object|image|formula|example|important|revision|definition)\b/i.test(trimmed) &&
    /\b(topic|chapter|important terms|quick revision|common mistake|formula|example|definition|note)\b/i.test(trimmed);
}

function looksLikeQuestionText(text: string) {
  const normalized = normalize(text).replace(/^[\d\s\-.):]+/, "").trim();
  if (!normalized) return false;

  if (isConceptLabelOnly(normalized)) return false;

  if (/\b(question|exercise|worksheet|assignment|homework|mcq|objective|problem|numerical|derivation|practice|example)\b/i.test(normalized)) {
    return true;
  }

  if (/\b(find|calculate|solve|evaluate|determine|compute|derive|prove|show|explain|describe|compare|differentiate|distinguish|state|define|name|list|draw|label|sketch|identify|classify|write|convert|why|how|what is|which of)\b/i.test(normalized)) {
    return true;
  }

  return false;
}

function isBoundaryLine(line: string) {
  const lower = normalize(line);
  if (/^(test|question|q)\s*\d+/i.test(line)) return true;
  if (/\b(test|question)\s*\d+\b/.test(lower)) return true;
  if (/^(physics|biology|chemistry|history|geography|mathematics|math|english)\b/i.test(line)) return true;
  if (/^(important terms|quick revision|common mistake|example|given|formula|therefore|answer|topic|chapter)\b/i.test(line)) return false;
  if (/^\d+[).:-]\s*/.test(line)) {
    const remainder = line.replace(/^\d+[).:-]\s*/, "").trim();
    if (isConceptLabelOnly(remainder)) return false;
    return looksLikeQuestionText(remainder) || /\b(question|exercise|problem|mcq|find|calculate|solve|derive|explain|describe)\b/i.test(remainder);
  }
  if (line.includes(" - ")) {
    return /\b(physics|biology|chemistry|history|geography|mathematics|math|english)\b/i.test(line);
  }
  return false;
}

function normalizeForDuplicateCheck(text: string) {
  return normalize(text)
    .replace(/[*•·•]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deduplicateBlocks(blocks: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const block of blocks) {
    const normalized = normalizeForDuplicateCheck(block);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(block.trim());
  }

  return deduped;
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

  const compact = deduplicateBlocks(blocks.filter((block) => block.length > 0));
  if (compact.length === 0) return [cleaned];

  return compact;
}

function extractQuestionHeaderNumber(block: string) {
  const match = block.match(/(?:^|\n)(?:test|question|q)\s*(\d+)\b/i);
  return match?.[1] ?? null;
}

function getBlockSummary(block: string) {
  const subjectGuess = detectSubject(block);
  const topicAndChapter = detectTopicAndChapter(block, subjectGuess.subject);
  const formulae = extractFormulaeDetailed(block)
    .filter((item) => item.confidence >= 0.6)
    .map((item) => item.normalized.toLowerCase());
  const keywords = new Set(extractKeywords(block));

  return {
    subject: subjectGuess.subject,
    chapter: topicAndChapter.chapter,
    topic: topicAndChapter.topic,
    formulae,
    keywords,
    hasExplicitQuestionHeader: /(?:^|\n)(?:test|question|q)\s*\d+/i.test(block),
    headerNumber: extractQuestionHeaderNumber(block),
  };
}

function countKeywordOverlap(left: Set<string>, right: Set<string>) {
  let overlap = 0;
  for (const value of left) {
    if (right.has(value)) overlap += 1;
  }
  return overlap;
}

function hasContinuationCue(block: string) {
  return /(?:^|\n)(continued|example|given|formula|therefore|answer|solution|important terms?|quick revision|common mistake)\b/i.test(block);
}

// Returns the leading integer of a numbered question/sub-part (e.g. "1." → 1, "2)" → 2), or null.
function getLeadingNumber(block: string): number | null {
  const first = (block.trimStart().split(/\r?\n/)[0] ?? "").trimStart();
  const match = first.match(/^(\d{1,2})[).:]\s/);
  return match ? parseInt(match[1], 10) : null;
}

// True when a block contains a cross-reference implying it depends on a preceding scenario.
const BACK_REFERENCE_RE = /\b(its|the answer|the result|the same|continues?|from (the )?(above|previous)|refer(ring|s)? to)\b/i;

// True when a block contains ≥2 physical quantities with units — i.e. it has its own embedded scenario.
function hasOwnNumericalScenario(block: string): boolean {
  const strippedNumber = block.replace(/^\d+[).:]\s*/, "");
  const matches = strippedNumber.match(/\b\d+\s*(?:km|m|cm|mm|kg|g|mg|s|min|hours?|h\b|m\/s|km\/h|%)\b/gi);
  return (matches?.length ?? 0) >= 2;
}

/**
 * Merges a non-numbered scenario block with the numbered sub-part sequence that follows it
 * (1., 2., 3. …) when those sub-parts clearly belong to the same parent question.
 * This prevents each sub-part from being counted as an independent question.
 */
function consolidateSubParts(blocks: string[]): string[] {
  if (blocks.length <= 2) return blocks;

  const result: string[] = [];
  let i = 0;

  while (i < blocks.length) {
    // Only trigger when we find a non-numbered block (potential scenario)
    if (getLeadingNumber(blocks[i]) === null) {
      // Scan ahead for a consecutive numbered sequence 1, 2, 3, …
      let j = i + 1;
      let expected = 1;
      while (j < blocks.length && getLeadingNumber(blocks[j]) === expected) {
        j++;
        expected++;
      }
      const subParts = blocks.slice(i + 1, j);
      if (subParts.length >= 2) {
        // Sub-parts qualify when they cross-reference context AND do NOT carry their own scenario
        const hasBackRef = subParts.some((b) => BACK_REFERENCE_RE.test(b));
        const noneHaveOwnScenario = !subParts.some(hasOwnNumericalScenario);
        if (hasBackRef && noneHaveOwnScenario) {
          result.push([blocks[i], ...subParts].join("\n"));
          i = j;
          continue;
        }
      }
    }
    result.push(blocks[i]);
    i++;
  }

  return result;
}

function shouldMergeAdjacentBlocks(current: string, next: string) {
  const currentSummary = getBlockSummary(current);
  const nextSummary = getBlockSummary(next);

  if (
    currentSummary.hasExplicitQuestionHeader &&
    nextSummary.hasExplicitQuestionHeader &&
    currentSummary.headerNumber &&
    nextSummary.headerNumber &&
    currentSummary.headerNumber !== nextSummary.headerNumber
  ) {
    return false;
  }

  if (
    currentSummary.subject !== UNKNOWN &&
    nextSummary.subject !== UNKNOWN &&
    currentSummary.subject !== nextSummary.subject
  ) {
    return false;
  }

  if (
    currentSummary.topic !== UNKNOWN &&
    nextSummary.topic !== UNKNOWN &&
    currentSummary.topic !== nextSummary.topic &&
    currentSummary.chapter !== UNKNOWN &&
    nextSummary.chapter !== UNKNOWN &&
    currentSummary.chapter !== nextSummary.chapter
  ) {
    return false;
  }

  let relationScore = 0;

  if (currentSummary.subject !== UNKNOWN && currentSummary.subject === nextSummary.subject) relationScore += 2;
  if (currentSummary.chapter !== UNKNOWN && currentSummary.chapter === nextSummary.chapter) relationScore += 2;
  if (currentSummary.topic !== UNKNOWN && currentSummary.topic === nextSummary.topic) relationScore += 3;
  if (countKeywordOverlap(currentSummary.keywords, nextSummary.keywords) >= 2) relationScore += 2;
  if (currentSummary.formulae.some((formula) => nextSummary.formulae.includes(formula))) relationScore += 1;
  if (!currentSummary.hasExplicitQuestionHeader && !nextSummary.hasExplicitQuestionHeader) relationScore += 1;
  if (hasContinuationCue(current) || hasContinuationCue(next)) relationScore += 1;

  return relationScore >= 4;
}

function mergeRelatedBlocks(blocks: string[]) {
  if (blocks.length <= 1) return blocks;

  const merged: string[] = [];

  for (const block of blocks) {
    const previous = merged[merged.length - 1];
    if (previous && shouldMergeAdjacentBlocks(previous, block)) {
      merged[merged.length - 1] = deduplicateBlocks([previous, block]).join("\n");
      continue;
    }
    merged.push(block);
  }

  return merged;
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
    const explicit = rule.aliases.some((alias) => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(segment));
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

function normalizeExplicitMetadataTitle(value: string) {
  const normalized = value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*[-–—]\s*/g, " - ");

  return normalized
    .split(/\s+/)
    .map((word) => {
      const lowerWord = word.toLowerCase();
      if (["and", "or", "of", "a", "an", "the"].includes(lowerWord)) return lowerWord;
      if (lowerWord === "i") return "I";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/\bAnd\b/g, "and")
    .replace(/\bOf\b/g, "of")
    .replace(/\bA\b/g, "a")
    .replace(/\bAn\b/g, "an")
    .replace(/\bThe\b/g, "the");
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
    ? normalizeExplicitMetadataTitle(explicitChapter)
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
          concept: topicRule.concept ?? mirrorConcept ?? UNKNOWN,
          topicConfidence: 0.92,
          chapterConfidence: validExplicitChapter ? 0.86 : 0.84,
          conceptConfidence: topicRule.concept ? 0.9 : mirrorConcept ? 0.86 : 0.3,
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

  const dashed = segment.split(/\s*[-–:]\s*/).map((part) => part.trim()).filter(Boolean);
  if (dashed.length >= 3) {
    const first = dashed[0];
    const middle = dashed[1];
    const tail = dashed[dashed.length - 1];
    const isLikelySubject = Object.keys(SUBJECT_RULES).some((subjectName) =>
      new RegExp(`\\b${subjectName.toLowerCase()}\\b`, "i").test(first.toLowerCase()),
    );

    if (isLikelySubject && middle.length > 2 && !/^\d+$/.test(middle) && !/\b(explain|solve|calculate|derive|state|write|show|answer|question)\b/i.test(middle)) {
      return {
        topic: middle,
        chapter: validExplicitChapter ?? UNKNOWN,
        concept: mirrorConcept ?? UNKNOWN,
        topicConfidence: 0.76,
        chapterConfidence: validExplicitChapter ? 0.86 : 0.45,
        conceptConfidence: mirrorConcept ? 0.84 : 0.3,
      };
    }

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

  normalized = normalized.replace(/^(?:formula|given|therefore|answer)\s*[:\-]\s*/i, "");

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
      /(?:[A-Za-z][A-Za-z0-9_]*\s*=\s*[^=].+|\b\d+\s*\/\s*[A-Za-z]\b|\b[A-Za-z]+\s*\+\s*[A-Za-z]+\s*(->|→)\s*[A-Za-z]+|\bV\s*=\s*I\s*R\b)/i.test(line) ||
      /\b(mirror formula|magnification|focal length|r\s*=\s*2f|f\s*=\s*\d+\s*cm)\b/i.test(lower);

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
    .filter((line) => {
      if (!line || !/\d/.test(line)) return false;
      if (/\b(calculate|find|solve|evaluate|determine|what is|compute)\b/i.test(line)) return true;
      if (/\b[a-z]\s*=\s*\d+.*|\b\d+\s*(?:cm|m|kg|g|s|v|a|n|w)\b/i.test(line)) return true;
      return /\b(?:r|f|v|u|m)\s*=\s*\d+/i.test(line);
    });
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
  const partitioned = partitionAcademicContent(rawText);
  const cleaned = partitioned.academicText;
  if (!cleaned) {
    const sanitizedRaw = sanitizeOcrText(rawText);
    if (!sanitizedRaw) {
      return [];
    }

    return [{
      ocrText: "",
      rawOcrText: rawText,
      cleanedOcrText: "",
      academicSourceContent: "",
      academicQuestions: [],
      academicMetadata: {
        subject: UNKNOWN,
        board: NOT_IDENTIFIED,
        classLevel: NOT_IDENTIFIED,
        chapter: UNKNOWN,
        topic: UNKNOWN,
        concept: UNKNOWN,
        questionType: UNKNOWN,
        questionTypes: [UNKNOWN],
        language: enforceConfidence(detectLanguage(sanitizedRaw).value, detectLanguage(sanitizedRaw).confidence),
        hasTables: false,
        hasExercises: false,
        examImportance: "Past-paper frequency unavailable.",
        formulae: [],
        keywords: [],
      },
      ignoredContent: deduplicateBlocks(sanitizedRaw.split(/\r?\n/).map(cleanLine).filter(Boolean)),
      subject: UNKNOWN,
      board: NOT_IDENTIFIED,
      classLevel: NOT_IDENTIFIED,
      chapter: UNKNOWN,
      topic: UNKNOWN,
      concept: UNKNOWN,
      questionType: UNKNOWN,
      questionTypes: [UNKNOWN],
      language: enforceConfidence(detectLanguage(sanitizedRaw).value, detectLanguage(sanitizedRaw).confidence),
      hasTables: false,
      hasExercises: false,
      examImportance: "Past-paper frequency unavailable.",
      formulae: [],
      formulaDetails: [],
      numericalQuestions: [],
      diagrams: [],
      keywords: [],
      confidence: {
        subject: 0.2,
        board: 0.28,
        classLevel: 0.3,
        chapter: 0.2,
        topic: 0.2,
        concept: 0.2,
        questionType: 0.35,
        language: detectLanguage(sanitizedRaw).confidence,
      },
    }];
  }

  const cleanedForAnalysis = normalizeOcrForAnalysis(cleaned);

  const boardGuess = detectBoard(cleanedForAnalysis);
  const classGuess = detectClassLevel(cleanedForAnalysis);
  const languageGuess = detectLanguage(cleanedForAnalysis);
  const cleanedSubjectGuess = detectSubject(cleanedForAnalysis);
  const cleanedTopicAndChapter = detectTopicAndChapter(cleanedForAnalysis, cleanedSubjectGuess.subject);
  const hasTables = detectHasTables(cleanedForAnalysis);
  const hasExercises = detectHasExercises(cleanedForAnalysis);
  const examImportance = detectExamImportance(cleanedForAnalysis);
  const blocks = mergeRelatedBlocks(consolidateSubParts(splitIntoQuestionBlocks(cleanedForAnalysis)));
  const contextTextForFormulaFilter = `${boardGuess.value} ${classGuess.value} ${cleanedForAnalysis}`;
  const cleanedFormulaDetailsRaw = extractFormulaeDetailed(cleanedForAnalysis);
  const cleanedRelevantFormulae = filterRelevantFormulaeByContext(
    cleanedFormulaDetailsRaw.map((item) => item.normalized),
    contextTextForFormulaFilter,
  );
  const cleanedFormulaSet = new Set(cleanedRelevantFormulae.map((item) => item.toLowerCase()));
  const cleanedFormulaDetails = cleanedFormulaDetailsRaw.filter((item) => cleanedFormulaSet.has(item.normalized.toLowerCase()));

  const questionBlocks = blocks.length === 1
    ? blocks.filter((block) => {
        if (!block || !block.trim()) return false;
        if (isConceptLabelOnly(block)) return false;
        return true;
      })
    : blocks.filter((block) => {
        if (!block || !block.trim()) return false;
        if (isConceptLabelOnly(block)) return false;

        const normalizedBlock = normalize(block);
        if (/\b(question|exercise|worksheet|assignment|homework|mcq|objective|problem|numerical|derivation|practice|example|find|calculate|solve|evaluate|determine|compute|derive|prove|show|explain|describe|compare|differentiate|distinguish|state|define|name|list|draw|label|sketch|identify|classify|write|convert|why|how|what is|which of)\b/i.test(normalizedBlock)) {
          return true;
        }

        if (/(^|\n)(test|question|q)\s*\d+/i.test(block)) return true;
        if (/\b(test|question)\s*\d+\b/i.test(block)) return true;

        return false;
      });

  const questions = questionBlocks.map((block) => {
    const subjectGuess = detectSubject(block);
    const topicAndChapter = detectTopicAndChapter(block, subjectGuess.subject);
    const questionType = detectQuestionType(block);
    const questionTypes = detectQuestionTypes(block);
    const formulaDetailsRaw = extractFormulaeDetailed(block);
    const formulaContextText = `${subjectGuess.subject} ${topicAndChapter.chapter} ${topicAndChapter.topic} ${topicAndChapter.concept ?? ""} ${block}`;
    const relevantFormulae = filterRelevantFormulaeByContext(
      formulaDetailsRaw.map((item) => item.normalized),
      formulaContextText,
    );
    const relevantFormulaSet = new Set(relevantFormulae.map((item) => item.toLowerCase()));
    const formulaDetails = formulaDetailsRaw.filter((item) => relevantFormulaSet.has(item.normalized.toLowerCase()));
    const normalizedFormulae = formulaDetails
      .filter((item) => item.confidence >= 0.6)
      .map((item) => item.normalized);
    const academicQuestions = extractAcademicQuestionLines(block);
    const subject = enforceConfidence(subjectGuess.subject, subjectGuess.confidence);
    const chapter = enforceConfidence(topicAndChapter.chapter, topicAndChapter.chapterConfidence);
    const topic = enforceConfidence(topicAndChapter.topic, topicAndChapter.topicConfidence);
    const concept = enforceConfidence(topicAndChapter.concept, topicAndChapter.conceptConfidence);
    const primaryQuestionType = enforceConfidence(questionType.value, questionType.confidence);
    const language = enforceConfidence(languageGuess.value, languageGuess.confidence);
    const keywords = extractKeywords(block);

    return {
      ocrText: block,
      rawOcrText: rawText,
      cleanedOcrText: block,
      academicSourceContent: block,
      academicQuestions,
      academicMetadata: {
        subject,
        board: boardGuess.value,
        classLevel: classGuess.value,
        chapter,
        topic,
        concept,
        questionType: primaryQuestionType,
        questionTypes,
        language,
        hasTables,
        hasExercises,
        examImportance,
        formulae: normalizedFormulae,
        keywords,
      },
      ignoredContent: partitioned.ignoredLines,
      subject,
      board: boardGuess.value,
      classLevel: classGuess.value,
      chapter,
      topic,
      concept,
      questionType: primaryQuestionType,
      questionTypes,
      language,
      hasTables,
      hasExercises,
      examImportance,
      formulae: normalizedFormulae,
      formulaDetails,
      numericalQuestions: extractNumericalQuestions(block),
      diagrams: extractDiagramPrompts(block),
      keywords,
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
          rawOcrText: rawText,
          cleanedOcrText: cleanedForAnalysis,
          academicSourceContent: cleanedForAnalysis,
          academicQuestions: extractAcademicQuestionLines(cleanedForAnalysis),
          academicMetadata: {
            subject: enforceConfidence(cleanedSubjectGuess.subject, cleanedSubjectGuess.confidence),
            board: boardGuess.value,
            classLevel: classGuess.value,
            chapter: enforceConfidence(cleanedTopicAndChapter.chapter, cleanedTopicAndChapter.chapterConfidence),
            topic: enforceConfidence(cleanedTopicAndChapter.topic, cleanedTopicAndChapter.topicConfidence),
            concept: enforceConfidence(cleanedTopicAndChapter.concept, cleanedTopicAndChapter.conceptConfidence),
            questionType: UNKNOWN,
            questionTypes: [UNKNOWN],
            language: enforceConfidence(languageGuess.value, languageGuess.confidence),
            hasTables,
            hasExercises,
            examImportance,
            formulae: cleanedFormulaDetails
              .filter((item) => item.confidence >= 0.6)
              .map((item) => item.normalized),
            keywords: extractKeywords(cleaned),
          },
          ignoredContent: partitioned.ignoredLines,
          subject: enforceConfidence(cleanedSubjectGuess.subject, cleanedSubjectGuess.confidence),
          board: boardGuess.value,
          classLevel: classGuess.value,
          chapter: enforceConfidence(cleanedTopicAndChapter.chapter, cleanedTopicAndChapter.chapterConfidence),
          topic: enforceConfidence(cleanedTopicAndChapter.topic, cleanedTopicAndChapter.topicConfidence),
          concept: enforceConfidence(cleanedTopicAndChapter.concept, cleanedTopicAndChapter.conceptConfidence),
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
            subject: cleanedSubjectGuess.confidence,
            board: boardGuess.confidence,
            classLevel: classGuess.confidence,
            chapter: cleanedTopicAndChapter.chapterConfidence,
            topic: cleanedTopicAndChapter.topicConfidence,
            concept: cleanedTopicAndChapter.conceptConfidence,
            questionType: 0.35,
            language: languageGuess.confidence,
          },
        },
      ];
}
