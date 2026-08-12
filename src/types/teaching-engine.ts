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
  "Dissected Visual",
  "Real-life Analogy",
  "Exam Importance",
  "Common Mistakes",
  "Memory Tricks",
  "Practice Questions",
  "Revision Notes",
  "Word Meanings",
  "Grammar Explanation",
  "Usage",
  "Examples",
  "Common Errors",
  "Timeline",
  "Map Explanation",
  "Cause and Effect",
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

export type FormulaExtraction = {
  raw: string;
  normalized: string;
  confidence: number;
};

export type ExtractedContent = {
  ocrText: string;
  cleanedOcrText?: string;
  subject: string;
  board: string;
  classLevel: string;
  chapter: string;
  topic: string;
  concept?: string;
  questionType: string;
  questionTypes: string[];
  language: string;
  hasTables: boolean;
  hasExercises: boolean;
  examImportance: string;
  formulae: string[];
  formulaDetails?: FormulaExtraction[];
  numericalQuestions: string[];
  diagrams: string[];
  keywords: string[];
  confidence?: {
    subject: number;
    board: number;
    classLevel: number;
    chapter: number;
    topic: number;
    concept?: number;
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

export type TeachingImageDefinition = {
  title: string;
  text: string;
};

export type TeachingImageFormula = {
  formula: string;
  meaning: string;
  units: string;
};

export type TeachingImageWorkedExample = {
  title: string;
  problem: string;
  steps: string;
};

export type TeachingImageDiagram = {
  title: string;
  description: string;
};

export type TeachingImageTable = {
  title: string;
  description: string;
};

export type TeachingCard = {
  title: string;
  explanation: string;
  keyPoints: string[];
  formula?: string;
  diagram?: string;
  example?: string;
  examImportance?: string;
  commonMistake?: string;
};

export type TeachingImageAnalysisResult = {
  mainTopic: string;
  subtopics: string[];
  sourceContent: string[];
  additionalExamCoverage: string[];
  definitions: TeachingImageDefinition[];
  formulae: TeachingImageFormula[];
  workedExamples: TeachingImageWorkedExample[];
  diagrams: TeachingImageDiagram[];
  tables: TeachingImageTable[];
  importantFacts: string[];
  examPoints: string[];
  commonQuestionTypes: string[];
  commonMistakes: string[];
  revisionPoints: string[];
  cards: TeachingCard[];
};
