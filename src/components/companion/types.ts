export type DiagramItem = { title: string; svg: string; caption: string };
export type ExampleItem = { title: string; problem: string; steps: string };
export type QA = { q: string; a: string };
export type VideoItem = { title: string; query: string };

export type AnalysisResult = {
  topic: string;
  solution: string;
  diagrams: DiagramItem[];
  simpleExamples: ExampleItem[];
  why: string;
  doubts: QA[];
  similarExamples: { easy: QA[]; moderate: QA[]; board: QA[] };
  videos: VideoItem[];
};

export const SUBJECTS = [
  "Mathematics",
  "Science",
  "Geography",
  "English",
  "Hindi",
  "Marathi",
  "Computer",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const TABS = [
  "Solution",
  "Visual Diagrams",
  "Simple Examples",
  "WHY",
  "Common Doubts",
  "Similar Examples",
  "Videos",
] as const;