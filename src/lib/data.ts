import {
  Atom,
  BookOpen,
  FlaskConical,
  Globe2,
  Languages,
  Leaf,
  Sigma,
  Landmark,
  type LucideIcon,
} from "lucide-react";

export type SubjectKey =
  | "math"
  | "physics"
  | "chemistry"
  | "biology"
  | "history"
  | "geography"
  | "english";

export type SubjectMeta = {
  key: SubjectKey;
  name: string;
  description: string;
  icon: LucideIcon;
  /** tailwind text color class */
  tone: string;
  /** tailwind gradient classes */
  gradient: string;
};

export const SUBJECTS: SubjectMeta[] = [
  {
    key: "math",
    name: "Mathematics",
    description: "Numbers, patterns, proofs — built from intuition.",
    icon: Sigma,
    tone: "text-emerald-300",
    gradient: "from-emerald-500/30 to-teal-500/10",
  },
  {
    key: "physics",
    name: "Physics",
    description: "Laws of motion, energy and the universe.",
    icon: Atom,
    tone: "text-sky-300",
    gradient: "from-sky-500/30 to-indigo-500/10",
  },
  {
    key: "chemistry",
    name: "Chemistry",
    description: "Atoms, reactions, and the matter around us.",
    icon: FlaskConical,
    tone: "text-fuchsia-300",
    gradient: "from-fuchsia-500/30 to-purple-500/10",
  },
  {
    key: "biology",
    name: "Biology",
    description: "Cells, life and how living systems work.",
    icon: Leaf,
    tone: "text-lime-300",
    gradient: "from-lime-500/30 to-emerald-500/10",
  },
  {
    key: "history",
    name: "History",
    description: "Stories, civilisations and turning points.",
    icon: Landmark,
    tone: "text-amber-300",
    gradient: "from-amber-500/30 to-orange-500/10",
  },
  {
    key: "geography",
    name: "Geography",
    description: "Earth, climate, maps and people.",
    icon: Globe2,
    tone: "text-cyan-300",
    gradient: "from-cyan-500/30 to-blue-500/10",
  },
  {
    key: "english",
    name: "English",
    description: "Grammar, literature and clear writing.",
    icon: BookOpen,
    tone: "text-rose-300",
    gradient: "from-rose-500/30 to-pink-500/10",
  },
];

export const LANGUAGE_ICON = Languages;

export type Importance = 1 | 2 | 3 | 4 | 5;

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  5: "Must Know",
  4: "Important",
  3: "Moderate",
  2: "Low Priority",
  1: "Optional",
};

export type TeacherNote = {
  kind: "tip" | "memory" | "error" | "exam" | "why";
  text: string;
};

export type Formula = { id: string; title: string; expression: string; meaning: string };
export type WorkedExample = { id: string; title: string; problem: string; solution: string };
export type Mistake = { id: string; wrong: string; right: string };

export type Chapter = {
  id: string;
  subject: SubjectKey;
  title: string;
  summary: string;
  importance: Importance;
  overview: string;
  deepUnderstanding: string;
  visualBreakdown: { title: string; description: string; svg?: string }[];
  formulas: Formula[];
  examples: WorkedExample[];
  mistakes: Mistake[];
  revision: string[];
  teacherNotes: TeacherNote[];
};

const circleSvg = `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#10b981"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><circle cx="100" cy="60" r="45" fill="none" stroke="url(#g)" stroke-width="3"/><line x1="100" y1="60" x2="145" y2="60" stroke="#fbbf24" stroke-width="2"/><text x="120" y="55" fill="#fbbf24" font-size="12" font-family="sans-serif">r</text><circle cx="100" cy="60" r="3" fill="#fff"/></svg>`;

const triangleSvg = `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg"><polygon points="30,120 170,120 100,20" fill="none" stroke="#22d3ee" stroke-width="3"/><text x="20" y="135" fill="#94a3b8" font-size="12">B</text><text x="170" y="135" fill="#94a3b8" font-size="12">C</text><text x="95" y="18" fill="#94a3b8" font-size="12">A</text></svg>`;

const atomSvg = `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="70" r="6" fill="#f472b6"/><ellipse cx="100" cy="70" rx="60" ry="22" fill="none" stroke="#a78bfa" stroke-width="2"/><ellipse cx="100" cy="70" rx="60" ry="22" fill="none" stroke="#22d3ee" stroke-width="2" transform="rotate(60 100 70)"/><ellipse cx="100" cy="70" rx="60" ry="22" fill="none" stroke="#34d399" stroke-width="2" transform="rotate(120 100 70)"/></svg>`;

export const CHAPTERS: Chapter[] = [
  {
    id: "math-quadratic",
    subject: "math",
    title: "Quadratic Equations",
    summary: "Solving ax² + bx + c = 0 using factorisation, formula and graphs.",
    importance: 5,
    overview:
      "A quadratic equation is any equation that can be rearranged into ax² + bx + c = 0 where a ≠ 0. The solutions are the x-values where the parabola y = ax² + bx + c crosses the x-axis.",
    deepUnderstanding:
      "Why a parabola? Because the squared term creates symmetry around a vertical line called the axis of symmetry. The roots tell you where the curve meets zero — physical examples include the path of a thrown ball and area problems.",
    visualBreakdown: [
      { title: "The Parabola", description: "Shape of y = x² shifts with b and c.", svg: circleSvg },
      { title: "Roots on the Axis", description: "Two real roots cut the x-axis at two points.", svg: triangleSvg },
    ],
    formulas: [
      {
        id: "f1",
        title: "Quadratic Formula",
        expression: "x = (-b ± √(b² − 4ac)) / 2a",
        meaning:
          "Born from completing the square on ax² + bx + c = 0. The ± gives the two symmetric roots around -b/2a.",
      },
      {
        id: "f2",
        title: "Discriminant",
        expression: "D = b² − 4ac",
        meaning: "D > 0 → two real roots, D = 0 → equal roots, D < 0 → complex roots.",
      },
    ],
    examples: [
      {
        id: "e1",
        title: "Small numbers first",
        problem: "Solve x² − 5x + 6 = 0",
        solution: "Factor: (x − 2)(x − 3) = 0 → x = 2 or x = 3.",
      },
      {
        id: "e2",
        title: "Using the formula",
        problem: "Solve 2x² + 3x − 2 = 0",
        solution: "a=2, b=3, c=-2 → D = 9 + 16 = 25 → x = (-3 ± 5)/4 → x = 0.5 or x = -2.",
      },
    ],
    mistakes: [
      {
        id: "m1",
        wrong: "Forgetting the ± sign in the quadratic formula.",
        right: "Always write both roots; ± is what gives you two answers.",
      },
      {
        id: "m2",
        wrong: "Dividing by x to ‘simplify’ x² = 5x.",
        right: "You lose the root x = 0. Move everything to one side: x² − 5x = 0 → x(x − 5) = 0.",
      },
    ],
    revision: [
      "Standard form: ax² + bx + c = 0, a ≠ 0.",
      "Sum of roots = -b/a, product = c/a.",
      "Discriminant decides nature of roots.",
      "Always check both solutions in the original equation.",
    ],
    teacherNotes: [
      { kind: "tip", text: "Try factorisation first — it’s faster when roots are integers." },
      { kind: "memory", text: "‘Minus b plus or minus square root, all over 2a’ — sing it." },
      { kind: "error", text: "Don’t forget to bring everything to one side before applying the formula." },
      { kind: "exam", text: "Most CBSE boards ask one nature-of-roots and one word problem." },
      { kind: "why", text: "Quadratics describe area, projectile height and many real shapes." },
    ],
  },
  {
    id: "physics-motion",
    subject: "physics",
    title: "Laws of Motion",
    summary: "Newton’s three laws and how forces change motion.",
    importance: 5,
    overview:
      "Newton’s laws explain how objects move when forces act on them. They are the foundation of classical mechanics.",
    deepUnderstanding:
      "First law: things keep doing what they’re doing unless pushed. Second law: a push changes velocity in proportion to mass. Third law: every push has an equal and opposite push back.",
    visualBreakdown: [
      { title: "Free-body diagram", description: "Arrows for every force on an object.", svg: triangleSvg },
      { title: "Action-Reaction", description: "Forces always come in pairs.", svg: atomSvg },
    ],
    formulas: [
      { id: "f1", title: "Newton’s Second Law", expression: "F = m × a", meaning: "Force equals mass times acceleration." },
      { id: "f2", title: "Weight", expression: "W = m × g", meaning: "Weight is the gravitational force on mass m." },
    ],
    examples: [
      {
        id: "e1",
        title: "Push a box",
        problem: "A 2 kg box accelerates at 3 m/s². Find force.",
        solution: "F = m·a = 2 × 3 = 6 N.",
      },
      {
        id: "e2",
        title: "Lift in a lift",
        problem: "A 50 kg person in a lift accelerating up at 2 m/s². Apparent weight?",
        solution: "N = m(g + a) = 50(10 + 2) = 600 N.",
      },
    ],
    mistakes: [
      { id: "m1", wrong: "Confusing mass and weight.", right: "Mass is in kg, weight is in newtons (m × g)." },
      { id: "m2", wrong: "Action-reaction on the same body.", right: "They always act on different bodies." },
    ],
    revision: [
      "F = ma is the second law.",
      "Inertia depends only on mass.",
      "Action and reaction act on different bodies.",
      "Net force = 0 means constant velocity, not always rest.",
    ],
    teacherNotes: [
      { kind: "tip", text: "Draw a free-body diagram before any numbers." },
      { kind: "memory", text: "‘F = ma’ — Father Mother Always." },
      { kind: "error", text: "Don’t mix Newtons with kilograms in the same line." },
      { kind: "exam", text: "Pulley + incline questions repeat almost every year." },
      { kind: "why", text: "Without Newton’s laws there is no engineering — bridges, cars, rockets all use them." },
    ],
  },
  {
    id: "chemistry-periodic",
    subject: "chemistry",
    title: "Periodic Table",
    summary: "Trends in atomic structure across periods and groups.",
    importance: 4,
    overview:
      "Elements arranged by atomic number reveal repeating patterns in size, energy and reactivity.",
    deepUnderstanding:
      "Going across a period, electrons fill the same shell so atoms get smaller. Going down a group, new shells are added so atoms get larger and lose electrons more easily.",
    visualBreakdown: [
      { title: "Atomic radius trend", description: "Decreases across, increases down.", svg: atomSvg },
    ],
    formulas: [
      { id: "f1", title: "Electronic Configuration", expression: "2, 8, 8, 18 …", meaning: "Max electrons per shell = 2n²." },
    ],
    examples: [
      { id: "e1", title: "Sodium", problem: "Find electronic configuration of Na (Z=11).", solution: "2, 8, 1." },
    ],
    mistakes: [
      { id: "m1", wrong: "Reading groups and periods in reverse.", right: "Period = row (horizontal). Group = column (vertical)." },
    ],
    revision: [
      "Modern table is by atomic number.",
      "Groups share valence electrons → similar chemistry.",
      "Metals on left, non-metals on right.",
    ],
    teacherNotes: [
      { kind: "tip", text: "Memorise first 20 elements — most questions stay there." },
      { kind: "exam", text: "Trend-based MCQs are guaranteed marks." },
    ],
  },
  {
    id: "biology-cell",
    subject: "biology",
    title: "The Cell",
    summary: "Smallest unit of life and its main organelles.",
    importance: 5,
    overview: "A cell is the basic structural and functional unit of all living organisms.",
    deepUnderstanding:
      "Each organelle has a job — nucleus stores instructions, mitochondria release energy, ribosomes build proteins.",
    visualBreakdown: [
      { title: "Plant vs animal cell", description: "Plant has cell wall and chloroplasts.", svg: circleSvg },
    ],
    formulas: [],
    examples: [
      { id: "e1", title: "Identify organelle", problem: "Which organelle makes ATP?", solution: "Mitochondria." },
    ],
    mistakes: [
      { id: "m1", wrong: "Calling cell wall the cell membrane.", right: "Cell wall = outer rigid layer (plants only). Membrane = thin selective layer in all cells." },
    ],
    revision: ["Nucleus = control center.", "Mitochondria = powerhouse.", "Ribosome = protein factory."],
    teacherNotes: [
      { kind: "memory", text: "‘MR. NICE’ — Mitochondria, Ribosome, Nucleus, ER, Cytoplasm, Endoplasm." },
      { kind: "exam", text: "Diagram-based questions appear every year." },
    ],
  },
  {
    id: "history-french-rev",
    subject: "history",
    title: "The French Revolution",
    summary: "Causes, course and consequences of 1789.",
    importance: 4,
    overview:
      "A turning point in world history when the French monarchy was overthrown and ideas of liberty, equality and fraternity spread across Europe.",
    deepUnderstanding:
      "Economic crisis + Enlightenment ideas + an inflexible monarchy = revolution. Society was split into three estates with the third estate carrying the tax burden.",
    visualBreakdown: [
      { title: "Three Estates", description: "Clergy, Nobility, Commoners.", svg: triangleSvg },
    ],
    formulas: [],
    examples: [
      { id: "e1", title: "Key date", problem: "When was the Bastille stormed?", solution: "14 July 1789." },
    ],
    mistakes: [
      { id: "m1", wrong: "Mixing French and American revolutions.", right: "American: 1776, against Britain. French: 1789, internal." },
    ],
    revision: ["Estates General called in 1789.", "Bastille fell on 14 July 1789.", "Declaration of Rights of Man — Aug 1789."],
    teacherNotes: [
      { kind: "tip", text: "Make a timeline — dates are easy marks." },
      { kind: "exam", text: "Source-based questions on the Declaration are common." },
    ],
  },
  {
    id: "geography-climate",
    subject: "geography",
    title: "Climate & Weather",
    summary: "Difference between climate and weather and the factors that shape them.",
    importance: 3,
    overview: "Weather is the day-to-day state of the atmosphere; climate is its long-term average.",
    deepUnderstanding:
      "Latitude, altitude, distance from sea, ocean currents and winds together shape a region’s climate.",
    visualBreakdown: [
      { title: "Heat zones", description: "Torrid, temperate and frigid.", svg: circleSvg },
    ],
    formulas: [],
    examples: [
      { id: "e1", title: "Coastal vs inland", problem: "Why is Mumbai’s climate moderate?", solution: "Sea breeze reduces temperature range." },
    ],
    mistakes: [
      { id: "m1", wrong: "Using ‘climate’ for a single rainy day.", right: "That’s weather. Climate is a 30-year average." },
    ],
    revision: ["Climate = long-term, weather = short-term.", "Six factors: latitude, altitude, distance from sea, ocean currents, winds, relief."],
    teacherNotes: [
      { kind: "tip", text: "Map-based marking questions love coastal vs inland." },
    ],
  },
  {
    id: "english-tenses",
    subject: "english",
    title: "Tenses",
    summary: "Past, present and future — twelve forms to express time precisely.",
    importance: 4,
    overview: "Tense tells the reader when an action happens and how it relates to other actions.",
    deepUnderstanding:
      "Each tense has four aspects: simple, continuous, perfect, perfect continuous. Pattern beats memorisation.",
    visualBreakdown: [
      { title: "Tense matrix", description: "3 times × 4 aspects = 12 tenses.", svg: triangleSvg },
    ],
    formulas: [
      { id: "f1", title: "Present continuous", expression: "S + am/is/are + V-ing", meaning: "Action happening right now." },
    ],
    examples: [
      { id: "e1", title: "Simple past", problem: "Convert: ‘I write a letter.’ to past.", solution: "‘I wrote a letter.’" },
    ],
    mistakes: [
      { id: "m1", wrong: "Mixing past and present in one sentence.", right: "Keep the tense consistent unless the meaning forces a shift." },
    ],
    revision: ["12 tenses total.", "Continuous = -ing, Perfect = has/have/had + V3."],
    teacherNotes: [
      { kind: "tip", text: "Spot the time word (yesterday, now, since) to pick the tense." },
    ],
  },
];

export function getSubject(key: string): SubjectMeta | undefined {
  return SUBJECTS.find((s) => s.key === key);
}

export function chaptersBySubject(key: SubjectKey): Chapter[] {
  return CHAPTERS.filter((c) => c.subject === key);
}

export function findChapter(id: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}