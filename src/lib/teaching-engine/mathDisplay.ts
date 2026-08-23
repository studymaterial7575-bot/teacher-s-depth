const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

const SUBSCRIPT_DIGITS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};

const GREEK_WORDS: Array<[RegExp, string]> = [
  [/\bDelta\b/g, "Δ"],
  [/\bdelta\b/g, "δ"],
  [/\balpha\b/g, "α"],
  [/\bbeta\b/g, "β"],
  [/\bgamma\b/g, "γ"],
  [/\btheta\b/g, "θ"],
  [/\bpi\b/g, "π"],
  [/\bmu\b/g, "μ"],
  [/\bsigma\b/g, "σ"],
];

const VULGAR_FRACTIONS: Record<string, string> = {
  "1/2": "½",
  "1/3": "⅓",
  "2/3": "⅔",
  "1/4": "¼",
  "3/4": "¾",
  "1/5": "⅕",
  "2/5": "⅖",
  "3/5": "⅗",
  "4/5": "⅘",
  "1/6": "⅙",
  "5/6": "⅚",
  "1/8": "⅛",
  "3/8": "⅜",
  "5/8": "⅝",
  "7/8": "⅞",
};

function toSuperscriptDigits(value: string) {
  return value
    .split("")
    .map((char) => SUPERSCRIPT_DIGITS[char] ?? char)
    .join("");
}

function toSubscriptDigits(value: string) {
  return value
    .split("")
    .map((char) => SUBSCRIPT_DIGITS[char] ?? char)
    .join("");
}

function hasMathSignals(value: string) {
  return /(?:[=±≤≥≠≈∴⇒∈∉×÷^√∛∫∑Σ∠△⊥∥]|\b(?:sqrt|cbrt|sin|cos|tan|log|ln|lim|dy|dx|sigma|theta|alpha|beta|gamma|delta|pi|mu)\b|\d+[A-Za-z]|[A-Za-z]\d)/i.test(
    value,
  );
}

function hasEquationContext(value: string) {
  return (
    /(?:=|±|≤|≥|≠|≈|∴|⇒|∈|∉|×|÷|\^|√|∛|∫|∑|Σ|∠|△|⊥|∥|\+|-)/.test(value) ||
    /\b(?:sqrt|cbrt|sin|cos|tan|log|ln|lim)\b/i.test(value)
  );
}

function isLabelLikeContext(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (hasEquationContext(trimmed)) return false;
  if (trimmed.length > 24) return false;
  return /^(?:[A-Za-z][A-Za-z0-9]*)(?:[\s,;:/-]+(?:[A-Za-z][A-Za-z0-9]*))*$/.test(trimmed);
}

function normalizeFractionSpacing(value: string) {
  return value.replace(/(?<!\w)(\d+)\s*\/\s*(\d+)(?!\w)/g, (_, left: string, right: string) => {
    const key = `${left}/${right}`;
    return VULGAR_FRACTIONS[key] ?? `${left} / ${right}`;
  });
}

function normalizeRelations(value: string) {
  return value
    .replace(/<=/g, "≤")
    .replace(/>=/g, "≥")
    .replace(/!=/g, "≠")
    .replace(/\bapproximately\b/gi, "≈")
    .replace(/\btherefore\b/gi, "∴")
    .replace(/\bimplies\b/gi, "⇒")
    .replace(/\bnot belongs to\b/gi, "∉")
    .replace(/\bbelongs to\b/gi, "∈");
}

function normalizeRoots(value: string) {
  return value
    .replace(/\bsqrt\s*\(/gi, "√(")
    .replace(/\bsqrt\s+([A-Za-z0-9(])/gi, "√$1")
    .replace(/\bcbrt\s*\(/gi, "∛(")
    .replace(/\bcbrt\s+([A-Za-z0-9(])/gi, "∛$1");
}

function normalizeGeometry(value: string) {
  return value
    .replace(/\bangle\s+([A-Za-z]{3,})\b/gi, "∠$1")
    .replace(/\btriangle\s+([A-Za-z]{3,})\b/gi, "△$1")
    .replace(/\bperpendicular to\b/gi, "⟂")
    .replace(/\bparallel to\b/gi, "∥");
}

function normalizeFunctions(value: string) {
  return value
    .replace(/\bx-bar\b/gi, "x̄")
    .replace(/\bdy\/dx\b/gi, "dy/dx")
    .replace(/\bd2y\/dx2\b/gi, "d²y/dx²")
    .replace(/\bsum\b/gi, "∑");
}

function normalizeMultiplication(value: string) {
  return value
    .replace(/\b(times|multiply|multiplied by)\b/gi, "×")
    .replace(/\s\*\s/g, " × ")
    .replace(/\bdivide(d)? by\b/gi, "÷");
}

function normalizeExplicitSymbols(value: string) {
  let next = value.replace(/\+\/-|\+-/g, "±");

  for (const [pattern, replacement] of GREEK_WORDS) {
    next = next.replace(pattern, replacement);
  }

  return next;
}

function normalizeLetterDigits(value: string) {
  const equationContext = hasEquationContext(value);
  const labelContext = isLabelLikeContext(value);

  return value.replace(/([A-Za-zα-ωΑ-Ω])(?:\^|_)?([0-9]+)/g, (_, base: string, suffix: string) => {
    if (equationContext) {
      return `${base}${toSuperscriptDigits(suffix)}`;
    }

    if (labelContext) {
      return `${base}${toSubscriptDigits(suffix)}`;
    }

    if (suffix.length === 1 && /[0-9]/.test(suffix)) {
      return `${base}${toSuperscriptDigits(suffix)}`;
    }

    return `${base}${suffix}`;
  });
}

function normalizeMathLine(line: string) {
  let next = line.trim();
  if (!next) return next;

  next = normalizeExplicitSymbols(next);
  next = normalizeRoots(next);
  next = normalizeGeometry(next);
  next = normalizeRelations(next);
  next = normalizeFunctions(next);
  next = normalizeMultiplication(next);
  next = normalizeFractionSpacing(next);
  next = normalizeLetterDigits(next);
  next = next.replace(/\s+/g, " ").trim();

  if (hasMathSignals(next)) {
    next = next.replace(/\s-\s/g, " − ").replace(/\(-/g, "(−").replace(/=\s*-/g, "= −");
  }

  return next;
}

export function formatMathDisplayText(value: string) {
  if (!value) return value;
  return value
    .split(/\r?\n/)
    .map((line) => normalizeMathLine(line))
    .join("\n");
}

export function hasMathNotation(value: string) {
  return hasMathSignals(value);
}
