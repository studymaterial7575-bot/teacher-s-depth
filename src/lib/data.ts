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
export type TopicSection = {
  id: string;
  title: string;
  definition: string;
  formula: string;
  explanation: string;
  workedExample: { problem: string; solution: string };
  commonMistakes: string[];
  revisionNotes: string[];
  searchKeywords: string[];
};

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
  searchKeywords?: string[];
  topicSections?: TopicSection[];
};

const circleSvg = `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#10b981"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><circle cx="100" cy="60" r="45" fill="none" stroke="url(#g)" stroke-width="3"/><line x1="100" y1="60" x2="145" y2="60" stroke="#fbbf24" stroke-width="2"/><text x="120" y="55" fill="#fbbf24" font-size="12" font-family="sans-serif">r</text><circle cx="100" cy="60" r="3" fill="#fff"/></svg>`;

const triangleSvg = `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg"><polygon points="30,120 170,120 100,20" fill="none" stroke="#22d3ee" stroke-width="3"/><text x="20" y="135" fill="#94a3b8" font-size="12">B</text><text x="170" y="135" fill="#94a3b8" font-size="12">C</text><text x="95" y="18" fill="#94a3b8" font-size="12">A</text></svg>`;

const atomSvg = `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="70" r="6" fill="#f472b6"/><ellipse cx="100" cy="70" rx="60" ry="22" fill="none" stroke="#a78bfa" stroke-width="2"/><ellipse cx="100" cy="70" rx="60" ry="22" fill="none" stroke="#22d3ee" stroke-width="2" transform="rotate(60 100 70)"/><ellipse cx="100" cy="70" rx="60" ry="22" fill="none" stroke="#34d399" stroke-width="2" transform="rotate(120 100 70)"/></svg>`;

const circuitSvg = `<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="28" width="34" height="64" rx="8" fill="none" stroke="#fbbf24" stroke-width="3"/><line x1="33" y1="36" x2="33" y2="84" stroke="#fbbf24" stroke-width="3"/><line x1="50" y1="60" x2="84" y2="60" stroke="#22d3ee" stroke-width="3"/><path d="M84 60h20l8-12 16 24 16-24 16 24 8-12h20" fill="none" stroke="#34d399" stroke-width="3" stroke-linejoin="round"/><line x1="188" y1="60" x2="224" y2="60" stroke="#22d3ee" stroke-width="3"/><line x1="224" y1="60" x2="224" y2="92" stroke="#22d3ee" stroke-width="3"/><line x1="224" y1="92" x2="33" y2="92" stroke="#22d3ee" stroke-width="3"/><text x="22" y="22" fill="#fbbf24" font-size="12">Battery</text><text x="102" y="38" fill="#34d399" font-size="12">Resistor</text><text x="138" y="106" fill="#94a3b8" font-size="12">Closed circuit</text></svg>`;

const parallelSvg = `<svg viewBox="0 0 240 140" xmlns="http://www.w3.org/2000/svg"><line x1="20" y1="24" x2="20" y2="116" stroke="#fbbf24" stroke-width="3"/><line x1="30" y1="34" x2="30" y2="106" stroke="#fbbf24" stroke-width="2"/><line x1="30" y1="46" x2="76" y2="46" stroke="#22d3ee" stroke-width="3"/><line x1="30" y1="94" x2="76" y2="94" stroke="#22d3ee" stroke-width="3"/><line x1="76" y1="46" x2="76" y2="94" stroke="#22d3ee" stroke-width="3"/><path d="M76 46h26l8-10 14 20 14-20 8 10h26" fill="none" stroke="#34d399" stroke-width="3" stroke-linejoin="round"/><path d="M76 94h26l8-10 14 20 14-20 8 10h26" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linejoin="round"/><line x1="172" y1="46" x2="220" y2="46" stroke="#22d3ee" stroke-width="3"/><line x1="172" y1="94" x2="220" y2="94" stroke="#22d3ee" stroke-width="3"/><line x1="220" y1="46" x2="220" y2="94" stroke="#22d3ee" stroke-width="3"/><text x="48" y="18" fill="#94a3b8" font-size="12">Parallel branches</text><text x="102" y="30" fill="#34d399" font-size="12">R1</text><text x="102" y="128" fill="#a78bfa" font-size="12">R2</text></svg>`;

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
    id: "physics-electricity",
    subject: "physics",
    title: "Electricity",
    summary: "Class 9 and 10 electricity fundamentals: current, resistance, circuits, power and heating effect.",
    importance: 5,
    overview:
      "Electricity studies how charges move in a closed path and how that movement transfers energy. For Class 9 and Class 10 students, this chapter connects daily devices like bulbs, heaters, chargers and household wiring with current, voltage, resistance and power.",
    deepUnderstanding:
      "Think of electric current as a steady flow of charges through a wire, pushed by potential difference and opposed by resistance. The same battery can give different currents depending on the material, length and thickness of the wire, and the way components are connected in series or parallel decides how a circuit behaves in real life.",
    visualBreakdown: [
      { title: "Simple circuit", description: "A battery, connecting wire and resistor form a complete path so current can flow.", svg: circuitSvg },
      { title: "Parallel branches", description: "Parallel circuits give each branch the same voltage while allowing current to split.", svg: parallelSvg },
    ],
    formulas: [
      {
        id: "f1",
        title: "Ohm’s Law",
        expression: "V = I R",
        meaning: "At constant temperature, potential difference across a conductor is directly proportional to current through it.",
      },
      {
        id: "f2",
        title: "Resistance from Ohm’s law",
        expression: "R = V / I",
        meaning: "Resistance tells how strongly a conductor opposes current. Higher resistance means less current for the same voltage.",
      },
      {
        id: "f3",
        title: "Resistivity relation",
        expression: "R = ρL / A",
        meaning: "Resistance depends on the material resistivity ρ, wire length L and cross-sectional area A.",
      },
      {
        id: "f4",
        title: "Series combination",
        expression: "Rseries = R1 + R2 + R3 + ...",
        meaning: "In series, current stays the same through each resistor and total resistance adds up.",
      },
      {
        id: "f5",
        title: "Parallel combination",
        expression: "1 / Rparallel = 1 / R1 + 1 / R2 + 1 / R3 + ...",
        meaning: "In parallel, voltage is the same across each branch and equivalent resistance becomes smaller than the smallest branch resistance.",
      },
      {
        id: "f6",
        title: "Electric power",
        expression: "P = V I = I²R = V² / R",
        meaning: "Power is the rate at which electrical energy is used or converted every second.",
      },
      {
        id: "f7",
        title: "Heating effect of current",
        expression: "H = I² R t",
        meaning: "Joule’s law of heating states that the heat produced in a resistor depends on current, resistance and time.",
      },
    ],
    examples: [
      {
        id: "e1",
        title: "Ohm’s Law: find current",
        problem: "A 6 V battery is connected across a 3 Ω resistor. Find the current.",
        solution: "Using I = V/R, I = 6/3 = 2 A. The circuit current is 2 ampere.",
      },
      {
        id: "e2",
        title: "Resistance from voltage and current",
        problem: "A conductor carries 0.5 A when connected to 4 V. Calculate resistance.",
        solution: "R = V/I = 4/0.5 = 8 Ω. The conductor has resistance 8 ohm.",
      },
      {
        id: "e3",
        title: "Resistivity comparison",
        problem: "Two wires of the same material have equal area, but one is twice as long. How does resistance change?",
        solution: "From R = ρL/A, if L doubles and ρ and A stay constant, resistance also doubles.",
      },
      {
        id: "e4",
        title: "Series circuit total resistance",
        problem: "Find the equivalent resistance of 2 Ω and 3 Ω connected in series.",
        solution: "Rseries = 2 + 3 = 5 Ω. Series combination increases total resistance.",
      },
      {
        id: "e5",
        title: "Parallel circuit equivalent resistance",
        problem: "Find the equivalent resistance of 6 Ω and 3 Ω connected in parallel.",
        solution: "1/R = 1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2, so R = 2 Ω.",
      },
      {
        id: "e6",
        title: "Electric power of an appliance",
        problem: "An electric iron works at 220 V and draws 5 A. Find its power.",
        solution: "P = VI = 220 × 5 = 1100 W. So the iron is rated at 1100 watt.",
      },
      {
        id: "e7",
        title: "Heating effect in a wire",
        problem: "A 2 Ω resistor carries 3 A for 5 s. Find heat produced.",
        solution: "H = I²Rt = 3² × 2 × 5 = 9 × 10 = 90 J. Heat produced is 90 joule.",
      },
    ],
    mistakes: [
      {
        id: "m1",
        wrong: "Using V = IR without keeping temperature constant in the idea of Ohm’s law.",
        right: "Ohm’s law is valid only when physical conditions such as temperature remain constant.",
      },
      {
        id: "m2",
        wrong: "Confusing resistance with resistivity.",
        right: "Resistance depends on the object. Resistivity is a material property and does not depend on the wire size.",
      },
      {
        id: "m3",
        wrong: "Adding resistors directly in parallel as R1 + R2.",
        right: "For parallel circuits, add reciprocals first: 1/R = 1/R1 + 1/R2 + ...",
      },
      {
        id: "m4",
        wrong: "Writing power as P = V/R.",
        right: "Use P = VI, I²R or V²/R depending on the known values.",
      },
      {
        id: "m5",
        wrong: "Forgetting that heating effect depends on time as well.",
        right: "Joule heating uses H = I²Rt, so longer time means more heat.",
      },
    ],
    revision: [
      "Current is the rate of flow of charge: I = Q/t.",
      "Ohm’s law gives V = IR when temperature is constant.",
      "Resistance increases with length and decreases with area: R = ρL/A.",
      "In series, current is same and resistances add. In parallel, voltage is same and equivalent resistance decreases.",
      "Electric power tells how fast electrical energy is used: P = VI.",
      "Heating effect follows Joule’s law: H = I²Rt.",
    ],
    teacherNotes: [
      { kind: "tip", text: "Start every circuit question by marking known values of V, I, R, P or t beside the diagram." },
      { kind: "memory", text: "Ohm’s triangle works well for revision: cover V to get I×R, cover I to get V/R, cover R to get V/I." },
      { kind: "error", text: "Students often mix up series and parallel rules. Ask: same current or same voltage? That decides the formula." },
      { kind: "exam", text: "Class 10 board papers repeatedly ask one numeric on equivalent resistance or electric power and one concept question on household wiring." },
      { kind: "why", text: "Electricity matters because every appliance is designed by balancing useful power output against heat loss in wires and resistors." },
    ],
    searchKeywords: [
      "class 9 electricity",
      "class 10 electricity",
      "electric current",
      "potential difference",
      "voltage current resistance",
      "ohms law",
      "resistance formula",
      "resistivity meaning",
      "series circuit",
      "parallel circuit",
      "equivalent resistance",
      "electric power formula",
      "joules law heating",
      "heating effect of current",
      "cbse electricity chapter",
    ],
    topicSections: [
      {
        id: "t1",
        title: "Ohm's Law",
        definition: "Ohm’s law states that the current through a conductor is directly proportional to the potential difference across it, provided temperature and other physical conditions remain constant.",
        formula: "V = IR",
        explanation: "If resistance stays fixed, doubling voltage doubles current. This rule helps predict current in simple circuits and is the base relation for most Class 10 numericals.",
        workedExample: {
          problem: "A torch bulb has resistance 4 Ω and is connected to 8 V. Find current.",
          solution: "I = V/R = 8/4 = 2 A.",
        },
        commonMistakes: [
          "Using Ohm’s law for non-ohmic devices without caution.",
          "Forgetting that the condition of constant temperature matters.",
        ],
        revisionNotes: [
          "V and I are directly proportional for an ohmic conductor.",
          "Graph of V against I is a straight line through the origin for an ohmic conductor.",
        ],
        searchKeywords: ["ohms law", "ohm law formula", "v ir", "relation between voltage current resistance"],
      },
      {
        id: "t2",
        title: "Resistance",
        definition: "Resistance is the opposition offered by a conductor to the flow of electric current.",
        formula: "R = V/I",
        explanation: "A higher resistance means charges face more opposition, so less current flows for the same potential difference.",
        workedExample: {
          problem: "A resistor draws 2 A from a 12 V battery. Find its resistance.",
          solution: "R = V/I = 12/2 = 6 Ω.",
        },
        commonMistakes: [
          "Writing the unit of resistance as volt or ampere instead of ohm.",
          "Assuming thicker wires have more resistance; thicker wires usually have less resistance.",
        ],
        revisionNotes: [
          "Unit of resistance is ohm (Ω).",
          "Longer wires have more resistance; thicker wires have less resistance.",
        ],
        searchKeywords: ["resistance definition", "resistance formula", "ohm unit", "factors affecting resistance"],
      },
      {
        id: "t3",
        title: "Resistivity",
        definition: "Resistivity is the intrinsic property of a material that tells how strongly it resists current.",
        formula: "ρ = RA/L",
        explanation: "Resistivity depends on the material, not on the shape of a particular sample. Copper has low resistivity, while alloys like nichrome have higher resistivity and are used in heaters.",
        workedExample: {
          problem: "A wire has resistance 10 Ω, length 2 m and area 0.5 m². Find resistivity.",
          solution: "ρ = RA/L = 10 × 0.5 / 2 = 2.5 Ω m.",
        },
        commonMistakes: [
          "Mixing resistance and resistivity in words and units.",
          "Forgetting that resistivity is a material property.",
        ],
        revisionNotes: [
          "Resistivity unit is ohm metre (Ω m).",
          "Nichrome has high resistivity and high melting point, so it is used in heating devices.",
        ],
        searchKeywords: ["resistivity formula", "rho ra by l", "difference between resistance and resistivity", "nichrome resistivity"],
      },
      {
        id: "t4",
        title: "Series and Parallel Circuits",
        definition: "In a series circuit components are connected one after another in a single path; in a parallel circuit components are connected across the same two points in separate branches.",
        formula: "Rseries = R1 + R2 + ... ; 1/Rparallel = 1/R1 + 1/R2 + ...",
        explanation: "Series circuits share the same current through every component, while parallel circuits share the same voltage across each branch. Homes use parallel wiring so appliances work independently.",
        workedExample: {
          problem: "Two resistors 4 Ω and 6 Ω are connected in parallel. Find equivalent resistance.",
          solution: "1/R = 1/4 + 1/6 = 3/12 + 2/12 = 5/12, so R = 12/5 = 2.4 Ω.",
        },
        commonMistakes: [
          "Using series addition for a parallel network.",
          "Saying current is always the same in parallel branches; current splits in parallel.",
        ],
        revisionNotes: [
          "Series: same current, different voltage drops.",
          "Parallel: same voltage, split current.",
        ],
        searchKeywords: ["series circuit formula", "parallel circuit formula", "equivalent resistance", "house wiring parallel"],
      },
      {
        id: "t5",
        title: "Electric Power",
        definition: "Electric power is the rate at which electrical energy is consumed or converted into other forms of energy.",
        formula: "P = VI",
        explanation: "A 100 W bulb converts 100 joule of electrical energy every second. The rating of an appliance tells how much power it uses at its correct voltage.",
        workedExample: {
          problem: "A fan works on 220 V and draws 0.5 A. Find power.",
          solution: "P = VI = 220 × 0.5 = 110 W.",
        },
        commonMistakes: [
          "Confusing power with electrical energy.",
          "Using watt-hour as a unit of power; it is a unit of energy.",
        ],
        revisionNotes: [
          "Unit of power is watt (W).",
          "1 kilowatt = 1000 watt.",
        ],
        searchKeywords: ["electric power", "power formula vi", "watt definition", "appliance rating"],
      },
      {
        id: "t6",
        title: "Heating Effect of Current",
        definition: "When electric current passes through a resistor, electrical energy is converted into heat energy.",
        formula: "H = I²Rt",
        explanation: "The wire resists moving charges, so collisions inside the conductor produce heat. This effect is useful in irons, heaters, toasters and fuses.",
        workedExample: {
          problem: "A heater coil of 10 Ω carries 2 A for 60 s. Find heat produced.",
          solution: "H = I²Rt = 2² × 10 × 60 = 2400 J.",
        },
        commonMistakes: [
          "Dropping the square on current in Joule’s law.",
          "Using minutes directly instead of converting time carefully when needed.",
        ],
        revisionNotes: [
          "More current means much more heating because current is squared.",
          "Fuse wire works by the heating effect of current.",
        ],
        searchKeywords: ["heating effect of current", "joules law", "h i square rt", "fuse heating effect"],
      },
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