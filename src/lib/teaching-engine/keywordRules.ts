import type { ModuleName } from "@/types/teaching-engine";

export const MODULES: readonly ModuleName[] = [
  "Simplest Understanding",
  "Logical Flow",
  "Visual Learning",
  "Formula Intelligence",
  "Common Mistakes",
  "Exam Importance",
  "Practice",
  "Concept Builder",
  "Real Life Examples",
  "Examples",
  "Timeline / Sequence",
];

export const DEFAULT_SELECTED_MODULES: ModuleName[] = [
  "Simplest Understanding",
  "Logical Flow",
  "Visual Learning",
];

export const RECOMMENDATION_RULES: Array<{
  label: string;
  keywords: string[];
  modules: ModuleName[];
}> = [
  {
    label: "Geometry / Maths",
    keywords: [
      "triangle",
      "circle",
      "angle",
      "quadrilateral",
      "polygon",
      "prove",
      "construction",
      "theorem",
      "radius",
      "diameter",
      "tangent",
      "chord",
      "arc",
      "area",
      "perimeter",
      "volume",
      "surface area",
    ],
    modules: ["Logical Flow", "Visual Learning", "Common Mistakes"],
  },
  {
    label: "Algebra",
    keywords: ["equation", "factorisation", "polynomial", "quadratic", "linear", "identity", "simplify", "solve", "formula"],
    modules: ["Formula Intelligence", "Logical Flow", "Practice"],
  },
  {
    label: "Science",
    keywords: ["diagram", "cell", "heart", "force", "energy", "electricity", "atom", "chemical", "reaction", "photosynthesis", "respiration"],
    modules: ["Visual Learning", "Concept Builder", "Real Life Examples"],
  },
  {
    label: "English",
    keywords: ["grammar", "essay", "letter", "comprehension", "poem", "story", "tense", "voice", "speech"],
    modules: ["Simplest Understanding", "Examples", "Practice"],
  },
  {
    label: "Social Studies",
    keywords: ["history", "geography", "civics", "economics", "constitution", "climate", "industry", "agriculture", "democracy"],
    modules: ["Timeline / Sequence", "Simplest Understanding", "Exam Importance"],
  },
];
