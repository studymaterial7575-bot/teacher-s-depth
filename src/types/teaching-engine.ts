export const MODULES = [
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
] as const;

export type ModuleName = (typeof MODULES)[number];

export type QuestionAnalysis = {
  subject: string;
  chapter: string;
  questionType: string;
  difficulty: string;
  skillsRequired: string[];
  visualRequired: string;
  formulaRequired: string;
  examImportance: string;
};

export type RecommendationSummary = {
  reasons: string[];
  modules: ModuleName[];
};

export const STUDENT_PROFILE_OPTIONS = [
  "Very weak",
  "Average",
  "Advanced",
  "Visual learner",
  "Student finds subject boring",
  "Exam preparation",
  "Quick revision",
  "Deep understanding",
  "Formula background",
  "Step-by-step explanation",
  "Teacher mode",
  "Parent mode",
] as const;

export const DEPTH_OPTIONS = [
  "Definition",
  "Background",
  "Real-life analogy",
  "Formula derivation",
  "Visual explanation",
  "Dissected visual",
  "Worked examples",
  "Common mistakes",
  "Revision notes",
  "Memory tricks",
  "Viva questions",
  "Board questions",
  "Practice questions",
] as const;

export const VISUAL_STYLE_OPTIONS = [
  "No visuals needed",
  "Simple labeled diagram",
  "Dissected step-by-step visual",
  "Flowchart style",
  "Table + diagram mix",
] as const;

export const EXPLANATION_STYLE_OPTIONS = [
  "Simple classroom language",
  "Exam-focused concise",
  "Story and analogy based",
  "Highly structured step-by-step",
  "Teacher training style",
  "Parent-friendly home tutoring style",
] as const;

export const OUTPUT_OPTIONS = [
  "Normal Solution",
  "Background",
  "Formula Breakdown",
  "Logical Flow",
  "Visual Explanation",
  "Real-life Analogy",
  "Exam Importance",
  "Common Mistakes",
  "Predicted Doubts",
  "Classroom Teaching Script",
  "Blackboard Writing",
  "Homework",
  "Practice Questions",
  "Revision Notes",
  "Word Meanings",
  "Grammar Explanation",
  "Timeline",
  "Map Explanation",
  "Flowchart",
  "Mind Map",
  "Infographic",
  "Create Teaching Image",
] as const;

export type StudentProfileOption = (typeof STUDENT_PROFILE_OPTIONS)[number];
export type DepthOption = (typeof DEPTH_OPTIONS)[number];
export type VisualStyleOption = (typeof VISUAL_STYLE_OPTIONS)[number];
export type ExplanationStyleOption = (typeof EXPLANATION_STYLE_OPTIONS)[number];
export type OutputOption = (typeof OUTPUT_OPTIONS)[number];

export type ExtractedContent = {
  ocrText: string;
  subject: string;
  board: string;
  classLevel: string;
  chapter: string;
  topic: string;
  questionType: string;
  questionTypes: string[];
  language: string;
  hasTables: boolean;
  hasExercises: boolean;
  examImportance: string;
  formulae: string[];
  numericalQuestions: string[];
  diagrams: string[];
  keywords: string[];
  confidence?: {
    subject: number;
    board: number;
    classLevel: number;
    chapter: number;
    topic: number;
    questionType: number;
    language: number;
  };
};

export type PromptBuilderInput = {
  sourceFiles: string[];
  extracted: ExtractedContent;
  extractedItems?: ExtractedContent[];
  studentProfile: StudentProfileOption[];
  depthOptions: DepthOption[];
  selectedOutputOptions: OutputOption[];
  visualStyle: VisualStyleOption;
  explanationStyle: ExplanationStyleOption;
  objective: string;
};
