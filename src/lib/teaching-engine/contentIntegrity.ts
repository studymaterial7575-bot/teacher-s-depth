const UI_ARTIFACT_PATTERNS = [
  /reply to chatgpt/i,
  /share a link to chat/i,
  /this creates a copy that others can chat with/i,
  /others can chat with/i,
  /select only/i,
  /copy link/i,
  /send message/i,
  /type a message/i,
  /chat controls?/i,
  /chatgpt/i,
  /new chat/i,
  /view all/i,
  /see all/i,
  /today$/i,
  /^home$/i,
  /^search$/i,
  /^message$/i,
  /^notifications?$/i,
  /^edit$/i,
  /^copy$/i,
  /^share$/i,
  /^more$/i,
  /^back$/i,
  /^\d{1,2}:\d{2}(\s?[ap]m)?$/i,
  /^\d{1,2}:\d{2}\s*\(.+\)$/i,
  /^\d{1,3}%$/,
  /^\d+\s*devices?\b/i,
  /\b(?:4g|5g|lte|volte|wifi|wi-fi|signal|battery|charging)\b/i,
  /\bstatus\s*bar\b/i,
  /\bdevice\s*indicators?\b/i,
  /^@\d{1,3}%$/,
  /^\d{1,2}:\d{2}\b.*\bdevices?\b/i,
  /^\d{1,2}:\d{2}\b.*@\d{1,3}%/i,
];

const PROMPT_METADATA_PATTERNS = [
  /you are generating a teaching response/i,
  /this is not a chatbot conversation/i,
  /content isolation rules\s*:/i,
  /source material\s*:/i,
  /extracted content\s*:/i,
  /student profile\s*:/i,
  /teaching depth required\s*:/i,
  /selected output options?\s*:/i,
  /required visual style\s*:/i,
  /required explanation style\s*:/i,
  /teaching objective\s*:/i,
  /output formatting instructions\s*:/i,
  /respond in exactly three sections/i,
  /do not ask follow-up questions/i,
  /generate the full educational response now/i,
];

const MIRROR_CONTEXT_PATTERN = /\b(light|reflection|refraction|mirror|mirrors|spherical mirror|spherical mirrors|concave|convex|focal length|radius of curvature|principal focus|mirror formula)\b/i;
const MIRROR_FORMULA_PATTERN = /\b(r\s*=\s*2\s*f|2\s*f\s*=\s*r|1\s*\/\s*f\s*=\s*1\s*\/\s*v\s*\+\s*1\s*\/\s*u|m\s*=\s*-?\s*v\s*\/\s*u)\b/i;
const ELECTRICITY_CONTEXT_PATTERN = /\b(electricity|current|voltage|resistance|ohm|circuit|ampere|potential difference)\b/i;
const ELECTRICITY_FORMULA_PATTERN = /\b(v\s*=\s*i\s*r|i\s*=\s*v\s*\/\s*r|r\s*=\s*v\s*\/\s*i|p\s*=\s*v\s*i)\b/i;
const UNKNOWN_VALUE_PATTERN = /^(unknown|not identified|not yet identified|detected subject|detected chapter|detected topic|general)$/i;

function normalizeLine(line: string) {
  return line.replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, " ").replace(/\s+/g, " ").trim();
}

function containsElectricityFormula(text: string) {
  return ELECTRICITY_FORMULA_PATTERN.test(text.toLowerCase());
}

function containsMirrorFormula(text: string) {
  return MIRROR_FORMULA_PATTERN.test(text.toLowerCase());
}

function isLikelyFormulaExpression(formula: string) {
  const normalized = normalizeLine(formula).toLowerCase();
  if (!normalized) return false;
  if (/(->|→)/.test(normalized)) return true;
  if (!normalized.includes("=")) return false;
  if (containsMirrorFormula(normalized) || containsElectricityFormula(normalized)) return true;
  const [lhs, rhsRaw] = normalized.split("=");
  const rhs = rhsRaw ?? "";
  if (!lhs || !rhs) return false;
  const lhsHasLetter = /[a-z]/i.test(lhs);
  const rhsHasOperator = /[+\-*/^]/.test(rhs);
  const rhsHasStandaloneVariable = /\b[a-z]\b/i.test(rhs);
  return lhsHasLetter && (rhsHasOperator || rhsHasStandaloneVariable);
}

function stripContextIrrelevantFormulaText(text: string, contextText: string) {
  const context = contextText.toLowerCase();
  const mirrorContext = MIRROR_CONTEXT_PATTERN.test(context);
  const electricityContext = ELECTRICITY_CONTEXT_PATTERN.test(context);
  const lines = text.split(/\r?\n/);
  const next: string[] = [];

  for (const rawLine of lines) {
    let line = normalizeLine(rawLine);
    if (!line) continue;

    if (mirrorContext && containsElectricityFormula(line)) {
      line = line.replace(/\b(v\s*=\s*i\s*r|i\s*=\s*v\s*\/\s*r|r\s*=\s*v\s*\/\s*i|p\s*=\s*v\s*i)\b/gi, "").replace(/\s+/g, " ").trim();
    }

    if (electricityContext && containsMirrorFormula(line)) {
      line = line.replace(/\b(r\s*=\s*2\s*f|2\s*f\s*=\s*r|1\s*\/\s*f\s*=\s*1\s*\/\s*v\s*\+\s*1\s*\/\s*u|m\s*=\s*-?\s*v\s*\/\s*u)\b/gi, "").replace(/\s+/g, " ").trim();
    }

    if (!line) continue;
    next.push(line);
  }

  return next.join("\n").trim();
}

export function isUiOrAppArtifactLine(line: string) {
  const normalized = normalizeLine(line);
  if (!normalized) return true;
  if (/^[^a-zA-Z0-9]+$/.test(normalized)) return true;
  return UI_ARTIFACT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isPromptOrMetadataLeakLine(line: string) {
  const normalized = normalizeLine(line);
  if (!normalized) return false;
  return PROMPT_METADATA_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function sanitizeEducationalText(text: string, maxLines = 400) {
  const lines = text.split(/\r?\n/);
  const output: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line) continue;
    if (isUiOrAppArtifactLine(line)) continue;
    if (isPromptOrMetadataLeakLine(line)) continue;

    const key = line.toLowerCase().replace(/[^a-z0-9=+\-*/^\s]/g, "").replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(line);
    if (output.length >= maxLines) break;
  }

  return output.join("\n").trim();
}

export function sanitizeEducationalTextByContext(text: string, contextText: string, maxLines = 400) {
  const sanitized = sanitizeEducationalText(text, maxLines);
  if (!sanitized) return "";
  return sanitizeEducationalText(stripContextIrrelevantFormulaText(sanitized, contextText), maxLines);
}

export function sanitizeEducationalLines(lines: string[], max = 8) {
  const output: string[] = [];

  for (const value of lines) {
    const cleaned = sanitizeEducationalText(value, 4);
    if (!cleaned) continue;
    const split = cleaned.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of split) {
      if (!output.includes(line)) {
        output.push(line);
      }
      if (output.length >= max) return output;
    }
  }

  return output;
}

export function isFormulaRelevantToContext(formula: string, contextText: string) {
  const normalizedFormula = normalizeLine(formula).toLowerCase();
  if (!normalizedFormula) return false;

  if (!isLikelyFormulaExpression(normalizedFormula)) return false;

  const context = contextText.toLowerCase();
  const mirrorContext = MIRROR_CONTEXT_PATTERN.test(context);
  const electricityContext = ELECTRICITY_CONTEXT_PATTERN.test(context);

  if (mirrorContext) {
    if (ELECTRICITY_FORMULA_PATTERN.test(normalizedFormula) && !MIRROR_FORMULA_PATTERN.test(normalizedFormula)) {
      return false;
    }
    return true;
  }

  if (electricityContext) {
    if (MIRROR_FORMULA_PATTERN.test(normalizedFormula) && !ELECTRICITY_FORMULA_PATTERN.test(normalizedFormula)) {
      return false;
    }
    return true;
  }

  return true;
}

export function filterRelevantFormulaeByContext(formulae: string[], contextText: string) {
  const result: string[] = [];

  for (const formula of formulae) {
    const cleaned = normalizeLine(formula);
    if (!cleaned) continue;
    if (!isFormulaRelevantToContext(cleaned, contextText)) continue;
    if (!result.includes(cleaned)) {
      result.push(cleaned);
    }
  }

  return result;
}

export function isUnknownLikeValue(value: string | undefined | null) {
  if (typeof value !== "string") return true;
  return UNKNOWN_VALUE_PATTERN.test(value.trim());
}

export function pickKnownValue(...values: Array<string | undefined | null>) {
  for (const value of values) {
    if (!isUnknownLikeValue(value)) {
      return value!.trim();
    }
  }
  return "";
}

export function getContextAwareFallbackFormula(contextText: string) {
  const context = contextText.toLowerCase();
  if (MIRROR_CONTEXT_PATTERN.test(context)) return "R = 2f";
  if (ELECTRICITY_CONTEXT_PATTERN.test(context)) return "V = IR";
  return "";
}
