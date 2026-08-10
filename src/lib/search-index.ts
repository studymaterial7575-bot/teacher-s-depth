import { CHAPTERS, SUBJECTS } from "@/lib/data";

export type SearchItemKind =
  | "chapter"
  | "topic"
  | "formula"
  | "definition"
  | "example"
  | "note"
  | "subject";

export type SearchableItem = {
  id: string;
  kind: SearchItemKind;
  title: string;
  subject: string;
  chapter: string;
  topic?: string;
  excerpt: string;
  href: string;
};

type IndexedItem = {
  id: string;
  kind: SearchItemKind;
  title: string;
  subject: string;
  subjectKey: string;
  chapter: string;
  topic?: string;
  href: string;
  text: string;
  tags: string[];
};

const KIND_PRIORITY: Record<SearchItemKind, number> = {
  chapter: 7,
  topic: 6,
  formula: 5,
  definition: 4,
  example: 3,
  note: 2,
  subject: 1,
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function chapterHref(subjectKey: string, chapterId: string) {
  return `/chapter/${subjectKey}/${chapterId}`;
}

function subjectHref(subjectKey: string) {
  return `/subjects/${subjectKey}`;
}

function toLineText(values: Array<string | undefined>) {
  return values
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ");
}

function chapterDerivedKeywords(subjectKey: string, chapterText: string) {
  const normalized = normalize(chapterText);
  const derived: string[] = [];

  if (subjectKey === "math" && /(quadratic|equation|polynomial|algebra)/.test(normalized)) {
    derived.push("algebra");
  }

  if (subjectKey === "english" && /(tense|grammar|sentence)/.test(normalized)) {
    derived.push("grammar");
  }

  if (subjectKey === "geography" && /(map|climate|weather|earth)/.test(normalized)) {
    derived.push("map work");
  }

  return derived;
}

function buildEducationIndex(): IndexedItem[] {
  const index: IndexedItem[] = [];

  for (const subject of SUBJECTS) {
    index.push({
      id: `subject-${subject.key}`,
      kind: "subject",
      title: subject.name,
      subject: subject.name,
      subjectKey: subject.key,
      chapter: "All chapters",
      href: subjectHref(subject.key),
      text: toLineText([subject.description]),
      tags: [subject.name, subject.key],
    });
  }

  for (const chapter of CHAPTERS) {
    const href = chapterHref(chapter.subject, chapter.id);
    const chapterBody = toLineText([
      chapter.summary,
      chapter.overview,
      chapter.deepUnderstanding,
      ...chapter.revision,
      ...chapter.teacherNotes.map((note) => note.text),
    ]);
    const chapterTags = [
      chapter.title,
      ...(chapter.searchKeywords ?? []),
      ...chapterDerivedKeywords(chapter.subject, `${chapter.title} ${chapterBody}`),
    ];

    index.push({
      id: `chapter-${chapter.id}`,
      kind: "chapter",
      title: chapter.title,
      subject: SUBJECTS.find((subject) => subject.key === chapter.subject)?.name ?? chapter.subject,
      subjectKey: chapter.subject,
      chapter: chapter.title,
      href,
      text: chapterBody,
      tags: chapterTags,
    });

    for (const formula of chapter.formulas) {
      index.push({
        id: `formula-${chapter.id}-${formula.id}`,
        kind: "formula",
        title: formula.title,
        subject: SUBJECTS.find((subject) => subject.key === chapter.subject)?.name ?? chapter.subject,
        subjectKey: chapter.subject,
        chapter: chapter.title,
        href,
        text: toLineText([formula.expression, formula.meaning]),
        tags: [formula.title, formula.expression, ...chapterTags],
      });
    }

    for (const example of chapter.examples) {
      index.push({
        id: `example-${chapter.id}-${example.id}`,
        kind: "example",
        title: example.title,
        subject: SUBJECTS.find((subject) => subject.key === chapter.subject)?.name ?? chapter.subject,
        subjectKey: chapter.subject,
        chapter: chapter.title,
        href,
        text: toLineText([example.problem, example.solution]),
        tags: [example.title, ...chapterTags],
      });
    }

    chapter.teacherNotes.forEach((note, noteIndex) => {
      index.push({
        id: `note-${chapter.id}-${note.kind}-${noteIndex}`,
        kind: "note",
        title: `${chapter.title} · ${note.kind}`,
        subject: SUBJECTS.find((subject) => subject.key === chapter.subject)?.name ?? chapter.subject,
        subjectKey: chapter.subject,
        chapter: chapter.title,
        href,
        text: note.text,
        tags: [note.kind, ...chapterTags],
      });
    });

    chapter.topicSections?.forEach((topicSection) => {
      index.push({
        id: `topic-${chapter.id}-${topicSection.id}`,
        kind: "topic",
        title: topicSection.title,
        subject: SUBJECTS.find((subject) => subject.key === chapter.subject)?.name ?? chapter.subject,
        subjectKey: chapter.subject,
        chapter: chapter.title,
        topic: topicSection.title,
        href,
        text: toLineText([
          topicSection.definition,
          topicSection.formula,
          topicSection.explanation,
          topicSection.workedExample.problem,
          topicSection.workedExample.solution,
          ...topicSection.commonMistakes,
          ...topicSection.revisionNotes,
        ]),
        tags: [topicSection.title, ...(topicSection.searchKeywords ?? []), ...chapterTags],
      });

      index.push({
        id: `definition-${chapter.id}-${topicSection.id}`,
        kind: "definition",
        title: `${topicSection.title} definition`,
        subject: SUBJECTS.find((subject) => subject.key === chapter.subject)?.name ?? chapter.subject,
        subjectKey: chapter.subject,
        chapter: chapter.title,
        topic: topicSection.title,
        href,
        text: topicSection.definition,
        tags: [topicSection.title, "definition", ...chapterTags],
      });

      index.push({
        id: `topic-example-${chapter.id}-${topicSection.id}`,
        kind: "example",
        title: `${topicSection.title} worked example`,
        subject: SUBJECTS.find((subject) => subject.key === chapter.subject)?.name ?? chapter.subject,
        subjectKey: chapter.subject,
        chapter: chapter.title,
        topic: topicSection.title,
        href,
        text: toLineText([topicSection.workedExample.problem, topicSection.workedExample.solution]),
        tags: [topicSection.title, "worked example", ...chapterTags],
      });

      topicSection.revisionNotes.forEach((revisionLine, revisionIndex) => {
        index.push({
          id: `topic-note-${chapter.id}-${topicSection.id}-${revisionIndex}`,
          kind: "note",
          title: `${topicSection.title} revision note ${revisionIndex + 1}`,
          subject: SUBJECTS.find((subject) => subject.key === chapter.subject)?.name ?? chapter.subject,
          subjectKey: chapter.subject,
          chapter: chapter.title,
          topic: topicSection.title,
          href,
          text: revisionLine,
          tags: [topicSection.title, "revision", ...chapterTags],
        });
      });
    });
  }

  return index;
}

const EDUCATION_INDEX = buildEducationIndex();

function buildExcerpt(text: string, query: string, terms: string[]) {
  const source = text.replace(/\s+/g, " ").trim();
  if (!source) return "";

  const lowerSource = source.toLowerCase();
  const phraseIndex = lowerSource.indexOf(query.toLowerCase());
  const termIndex = terms
    .map((term) => lowerSource.indexOf(term))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b)[0];

  const anchor = phraseIndex >= 0 ? phraseIndex : (termIndex ?? -1);
  if (anchor < 0) {
    return source.length <= 170 ? source : `${source.slice(0, 167)}...`;
  }

  const start = Math.max(0, anchor - 70);
  const end = Math.min(source.length, anchor + 120);
  const snippet = source.slice(start, end);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < source.length ? "..." : "";
  return `${prefix}${snippet}${suffix}`;
}

export function searchEducationContent(query: string): SearchableItem[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const normalizedQuery = normalize(trimmed);
  const terms = normalizedQuery.split(" ").filter(Boolean);

  return EDUCATION_INDEX
    .map((item) => {
      const haystack = normalize(
        `${item.title} ${item.subject} ${item.chapter} ${item.topic ?? ""} ${item.text} ${item.tags.join(" ")}`,
      );
      const haystackTokens = new Set(haystack.split(" ").filter(Boolean));
      const titleTokens = new Set(normalize(item.title).split(" ").filter(Boolean));
      const subjectTokens = new Set(normalize(item.subject).split(" ").filter(Boolean));
      const chapterTopicTokens = new Set(
        normalize(`${item.chapter} ${item.topic ?? ""}`).split(" ").filter(Boolean),
      );
      const tagTokens = new Set(normalize(item.tags.join(" ")).split(" ").filter(Boolean));

      let score = 0;

      if (haystack.includes(normalizedQuery)) score += 120;

      for (const term of terms) {
        if (term.length < 2) continue;
        if (titleTokens.has(term)) score += 35;
        if (subjectTokens.has(term)) score += 20;
        if (chapterTopicTokens.has(term)) score += 24;
        if (tagTokens.has(term)) score += 16;
        if (haystackTokens.has(term)) score += 8;
      }

      if (score === 0) return null;

      return {
        item,
        score,
        excerpt: buildExcerpt(item.text, trimmed, terms),
      };
    })
    .filter((entry): entry is { item: IndexedItem; score: number; excerpt: string } => Boolean(entry))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return KIND_PRIORITY[b.item.kind] - KIND_PRIORITY[a.item.kind];
    })
    .slice(0, 50)
    .map(({ item, excerpt }) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      subject: item.subject,
      chapter: item.chapter,
      topic: item.topic,
      href: item.href,
      excerpt,
    }));
}
