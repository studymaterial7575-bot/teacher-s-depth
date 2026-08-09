export type SearchableItem = {
  id: string;
  kind: "chapter" | "topic" | "example" | "note" | "subject";
  title: string;
  subtitle: string;
  content: string;
  subject: string;
  chapterId?: string;
  href: string;
};

const educationContent: SearchableItem[] = [
  {
    id: "electricity-basic",
    kind: "subject",
    title: "Electricity",
    subtitle: "Physics · Electricity & Circuits",
    subject: "Physics",
    content:
      "Electricity current voltage resistance ohm's law circuit battery resistor power energy series parallel conductors insulators symbols formula V = IR",
    href: "/search?q=Electricity",
  },
  {
    id: "ohms-law",
    kind: "topic",
    title: "Ohm's Law",
    subtitle: "Physics · Electricity",
    subject: "Physics",
    content:
      "Ohm's law states voltage equals current times resistance. V = IR relationship between voltage current and resistance in a simple circuit.",
    href: "/search?q=Ohm%27s%20Law",
  },
  {
    id: "quadratic-formula",
    kind: "topic",
    title: "Quadratic Formula",
    subtitle: "Mathematics · Algebra",
    subject: "Mathematics",
    content:
      "Quadratic formula solves equations of the form ax² + bx + c = 0. Discriminant determines nature of roots real and complex solutions.",
    href: "/search?q=Quadratic%20Formula",
  },
  {
    id: "grammar-rules",
    kind: "topic",
    title: "Grammar",
    subtitle: "English · Language Rules",
    subject: "English",
    content:
      "Grammar includes nouns pronouns verbs adjectives adverbs tense articles prepositions conjunctions sentence structure punctuation and usage rules.",
    href: "/search?q=Grammar",
  },
  {
    id: "map-work",
    kind: "topic",
    title: "Map Work",
    subtitle: "Geography · Skills",
    subject: "Geography",
    content:
      "Map work includes scale direction latitude longitude contour lines symbols legends distances and reading topographic maps.",
    href: "/search?q=Map+Work",
  },
  {
    id: "hindi-grammar",
    kind: "topic",
    title: "Hindi",
    subtitle: "Language · Grammar & Usage",
    subject: "Hindi",
    content:
      "Hindi grammar includes sandhi samas vibhakti vaakya rachna vyakaran shabd rachna sentences and language usage examples.",
    href: "/search?q=Hindi",
  },
  {
    id: "marathi-grammar",
    kind: "topic",
    title: "Marathi",
    subtitle: "Language · Grammar & Usage",
    subject: "Marathi",
    content:
      "Marathi language includes vyaakaran shabd roop ling vakya sampadana vyavhar and grammar rules with examples and practice.",
    href: "/search?q=Marathi",
  },
  {
    id: "computer-fundamentals",
    kind: "subject",
    title: "Computer",
    subtitle: "Technology · Basics",
    subject: "Computer",
    content:
      "Computer basics include hardware software input output memory CPU storage operating system networks internet and logic flow.",
    href: "/search?q=Computer",
  },
  {
    id: "physics-circuit",
    kind: "note",
    title: "Circuit Basics",
    subtitle: "Physics · Electricity",
    subject: "Physics",
    content:
      "A closed circuit is required for current to flow. Series and parallel arrangements affect total resistance and brightness of bulbs.",
    href: "/search?q=Circuit+Basics",
  },
  {
    id: "math-linear-equation",
    kind: "example",
    title: "Linear Equation",
    subtitle: "Mathematics · Algebra",
    subject: "Mathematics",
    content:
      "Solve 3x + 7 = 22 by subtracting 7 then dividing by 3 to get x = 5. Linear equations model real-world relationships.",
    href: "/search?q=Linear+Equation",
  },
  {
    id: "english-tense",
    kind: "topic",
    title: "Tenses",
    subtitle: "English · Grammar",
    subject: "English",
    content:
      "Tenses indicate time in grammar. Present past and future forms include simple continuous perfect and perfect continuous patterns.",
    href: "/search?q=Tenses",
  },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

export function searchEducationContent(query: string): SearchableItem[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const terms = normalize(trimmed).split(" ").filter(Boolean);
  const lowerQuery = normalize(trimmed);

  return educationContent
    .map((item) => {
      const haystack = normalize(`${item.title} ${item.subtitle} ${item.content} ${item.subject}`);
      let score = 0;

      if (haystack.includes(lowerQuery)) score += 60;
      terms.forEach((term) => {
        if (item.title.toLowerCase().includes(term)) score += 25;
        if (item.subject.toLowerCase().includes(term)) score += 8;
        if (item.content.toLowerCase().includes(term)) score += 12;
      });

      if (item.kind === "subject" && lowerQuery === normalize(item.title)) score += 30;
      if (item.kind === "topic" && lowerQuery.includes(normalize(item.title))) score += 20;

      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
