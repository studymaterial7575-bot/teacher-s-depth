import type { ExtractedContent } from "@/types/teaching-engine";

const UNKNOWN = "Unknown";
const MIN_CONFIDENCE = 0.6;

type SubjectKey = "Physics" | "Biology" | "Chemistry" | "History" | "Geography" | "Mathematics" | "English";

type TopicRule = {
  topic: string;
  chapter: string;
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
    keywords: ["ohm", "current", "voltage", "resistance", "electricity", "circuit", "v = i", "v=ir", "power", "motion", "force"],
    topics: [
      { topic: "Ohm's Law", chapter: "Electricity", aliases: ["ohm", "ohm's law", "v = ir", "v=ir", "resistance", "current", "voltage"] },
      { topic: "Electric Circuit", chapter: "Electricity", aliases: ["circuit", "series circuit", "parallel circuit"] },
      { topic: "Motion", chapter: "Motion", aliases: ["velocity", "acceleration", "displacement", "motion"] },
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
  return { value: UNKNOWN, confidence: 0.28 };
}

function detectClassLevel(text: string) {
  const match = text.match(/\b(?:class|grade|std)\s*([6-9]|10|11|12)\b/i);
  if (match?.[1]) return { value: `Class ${match[1]}`, confidence: 0.95 };
  return { value: UNKNOWN, confidence: 0.3 };
}

function detectTopicAndChapter(segment: string, subject: string) {
  const explicitTopic = segment.match(/\btopic\s*[:\-]?\s*([^\n.]+)/i)?.[1]?.trim();
  const explicitChapter = segment.match(/\bchapter\s*[:\-]?\s*([^\n.]+)/i)?.[1]?.trim();

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
          topicConfidence: 0.92,
          chapterConfidence: validExplicitChapter ? 0.86 : 0.84,
        };
      }
    }

    return {
      topic: explicitTopic,
      chapter: validExplicitChapter ?? UNKNOWN,
      topicConfidence: 0.92,
      chapterConfidence: validExplicitChapter ? 0.86 : 0.45,
    };
  }

  if (subject !== UNKNOWN && subject in SUBJECT_RULES) {
    const subjectRule = SUBJECT_RULES[subject as SubjectKey];
    const lower = normalize(segment);
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
        topicConfidence: clamp(0.74 + winner.score * 0.05),
        chapterConfidence: validExplicitChapter ? 0.86 : clamp(0.72 + winner.score * 0.05),
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
        topicConfidence: 0.66,
        chapterConfidence: validExplicitChapter ? 0.86 : 0.45,
      };
    }
  }

  return {
    topic: UNKNOWN,
    chapter: validExplicitChapter ?? UNKNOWN,
    topicConfidence: 0.3,
    chapterConfidence: validExplicitChapter ? 0.86 : 0.3,
  };
}

function detectQuestionType(segment: string) {
  const lower = normalize(segment);

  if (/\b(mcq|multiple choice|true\s*or\s*false|objective)\b/.test(lower)) {
    return { value: "Objective", confidence: 0.95 };
  }

  if (/\b(calculate|find|compute|evaluate|determine)\b/.test(lower)) {
    return { value: "Numerical", confidence: 0.93 };
  }

  if (/\b(draw|label|sketch|diagram|plot)\b/.test(lower)) {
    return { value: "Diagram Required", confidence: 0.9 };
  }

  if (/\b(explain|describe|discuss|why|how)\b/.test(lower)) {
    return { value: "Long Answer", confidence: 0.86 };
  }

  if (/\b(state|define|name|list)\b/.test(lower)) {
    return { value: "Short Answer", confidence: 0.78 };
  }

  return { value: UNKNOWN, confidence: 0.35 };
}

function detectQuestionTypes(segment: string) {
  const lower = normalize(segment);
  const types = new Set<string>();

  if (/\b(mcq|multiple choice|true\s*or\s*false|objective)\b/.test(lower)) {
    types.add("Objective");
  }

  if (/\b(calculate|find|compute|evaluate|determine)\b/.test(lower)) {
    types.add("Numerical");
  }

  if (/\b(draw|label|sketch|diagram|plot)\b/.test(lower)) {
    types.add("Diagram Required");
  }

  if (/\b(explain|describe|discuss|why|how)\b/.test(lower)) {
    types.add("Long Answer");
  }

  if (/\b(state|define|name|list)\b/.test(lower)) {
    types.add("Short Answer");
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
  if (/\b(board exam|final exam|important|very important|frequently asked|5 marks|3 marks|2 marks)\b/.test(lower)) {
    return "High";
  }
  if (/\b(exam|assessment|test|revision)\b/.test(lower)) {
    return "Medium";
  }
  return "Not identified";
}

function extractFormulae(segment: string) {
  return segment
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /([A-Za-z][A-Za-z0-9_]*\s*=\s*[^=].*|[A-Za-z]+\s*\+\s*[A-Za-z]+\s*(->|→)\s*[A-Za-z]+|\bV\s*=\s*I\s*R\b)/i.test(line));
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

function enforceConfidence(value: string, confidence: number) {
  return confidence >= MIN_CONFIDENCE ? value : UNKNOWN;
}

export function extractAcademicQuestions(rawText: string): ExtractedContent[] {
  const cleaned = sanitizeOcrText(rawText);
  if (!cleaned) {
    return [];
  }

  const boardGuess = detectBoard(cleaned);
  const classGuess = detectClassLevel(cleaned);
  const languageGuess = detectLanguage(cleaned);
  const hasTables = detectHasTables(cleaned);
  const hasExercises = detectHasExercises(cleaned);
  const examImportance = detectExamImportance(cleaned);
  const blocks = splitIntoQuestionBlocks(cleaned);

  const questions = blocks.map((block) => {
    const subjectGuess = detectSubject(block);
    const topicAndChapter = detectTopicAndChapter(block, subjectGuess.subject);
    const questionType = detectQuestionType(block);
    const questionTypes = detectQuestionTypes(block);

    return {
      ocrText: block,
      subject: enforceConfidence(subjectGuess.subject, subjectGuess.confidence),
      board: enforceConfidence(boardGuess.value, boardGuess.confidence),
      classLevel: enforceConfidence(classGuess.value, classGuess.confidence),
      chapter: enforceConfidence(topicAndChapter.chapter, topicAndChapter.chapterConfidence),
      topic: enforceConfidence(topicAndChapter.topic, topicAndChapter.topicConfidence),
      questionType: enforceConfidence(questionType.value, questionType.confidence),
      questionTypes,
      language: enforceConfidence(languageGuess.value, languageGuess.confidence),
      hasTables,
      hasExercises,
      examImportance,
      formulae: extractFormulae(block),
      numericalQuestions: extractNumericalQuestions(block),
      diagrams: extractDiagramPrompts(block),
      keywords: extractKeywords(block),
      confidence: {
        subject: subjectGuess.confidence,
        board: boardGuess.confidence,
        classLevel: classGuess.confidence,
        chapter: topicAndChapter.chapterConfidence,
        topic: topicAndChapter.topicConfidence,
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
          subject: UNKNOWN,
          board: enforceConfidence(boardGuess.value, boardGuess.confidence),
          classLevel: enforceConfidence(classGuess.value, classGuess.confidence),
          chapter: UNKNOWN,
          topic: UNKNOWN,
          questionType: UNKNOWN,
          questionTypes: [UNKNOWN],
          language: enforceConfidence(languageGuess.value, languageGuess.confidence),
          hasTables,
          hasExercises,
          examImportance,
          formulae: extractFormulae(cleaned),
          numericalQuestions: extractNumericalQuestions(cleaned),
          diagrams: extractDiagramPrompts(cleaned),
          keywords: extractKeywords(cleaned),
          confidence: {
            subject: 0.2,
            board: boardGuess.confidence,
            classLevel: classGuess.confidence,
            chapter: 0.2,
            topic: 0.2,
            questionType: 0.35,
            language: languageGuess.confidence,
          },
        },
      ];
}
