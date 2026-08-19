import type { AnalysisResult } from "@/components/companion/types";

type AnalyzePayload = {
  subject: string;
  text?: string;
  files?: { name: string; mime: string; dataUrl: string }[];
};

function normalizeTopic(subject: string, text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return `${subject} core concept`;
  const short = cleaned.slice(0, 80);
  return `${subject}: ${short}`;
}

function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSimpleSvg(topic: string) {
  const safeTopic = escapeXml(topic.slice(0, 52));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260"><rect x="16" y="16" width="368" height="228" rx="18" fill="none" stroke="currentColor"/><rect x="40" y="44" width="140" height="48" rx="10" fill="none" stroke="currentColor"/><text x="110" y="73" text-anchor="middle" font-size="14" fill="currentColor">Concept</text><rect x="220" y="44" width="140" height="48" rx="10" fill="none" stroke="currentColor"/><text x="290" y="73" text-anchor="middle" font-size="14" fill="currentColor">Formula/Rule</text><rect x="130" y="150" width="140" height="48" rx="10" fill="none" stroke="currentColor"/><text x="200" y="179" text-anchor="middle" font-size="14" fill="currentColor">Example</text><line x1="180" y1="68" x2="220" y2="68" stroke="currentColor"/><line x1="110" y1="92" x2="170" y2="150" stroke="currentColor"/><line x1="290" y1="92" x2="230" y2="150" stroke="currentColor"/><text x="200" y="232" text-anchor="middle" font-size="12" fill="currentColor">${safeTopic}</text></svg>`;
}

export function buildLocalCompanionAnalysis(payload: AnalyzePayload): AnalysisResult {
  const text = (payload.text || "").trim();
  const fileCount = payload.files?.length || 0;
  const topic = normalizeTopic(payload.subject || "General", text);
  const contextLine = text
    ? `Teacher context: ${text}`
    : `Teacher uploaded ${fileCount > 0 ? `${fileCount} file(s)` : "no files"}.`;

  return {
    topic,
    importanceStars: 3,
    importanceLabel: "Moderate",
    teacherNote: "Good for periodic tests. Build final answer using external AI.",
    solution:
      `Prompt-builder mode is active. Internal paid AI calls are disabled.\n\n` +
      `Use the generated structure below as a copy-ready blueprint for ChatGPT/Gemini/Copilot.\n` +
      `${contextLine}\n\n` +
      `Suggested prompt scaffold:\n` +
      `1) Explain the concept in very simple classroom language.\n` +
      `2) Give intuition first, then formula/rule.\n` +
      `3) Solve one easy, one moderate, one board-style example.\n` +
      `4) Add common mistakes and exam tips.`,
    diagrams: [
      {
        title: "Concept -> Rule -> Example",
        svg: buildSimpleSvg(topic),
        caption:
          "Local classroom diagram scaffold. You can send the same topic to external AI for richer visuals.",
      },
    ],
    simpleExamples: [
      {
        title: "Easy start",
        problem: `Create a beginner-friendly ${payload.subject} example for: ${topic}`,
        steps:
          "Step 1: Identify what is given.\nStep 2: State the rule/formula.\nStep 3: Substitute simple values.\nStep 4: Conclude in one sentence.",
      },
      {
        title: "Moderate practice",
        problem: `Create a moderate practice question with classroom context for: ${topic}`,
        steps:
          "Step 1: Break into sub-parts.\nStep 2: Solve sequentially.\nStep 3: Validate units/logic.\nStep 4: Summarize the method.",
      },
    ],
    why:
      "This mode prevents accidental internal API usage. Teacher's Depth now organizes inputs and builds a high-quality prompt, while the final AI reasoning is performed in your chosen external AI.",
    doubts: [
      {
        q: "Why is the app not generating full AI content directly?",
        a: "The app is intentionally running in prompt-builder-only mode to avoid internal paid AI calls.",
      },
      {
        q: "How do I get the final teaching answer?",
        a: "Copy the generated prompt and run it in ChatGPT, Gemini, Copilot, or another external AI.",
      },
      {
        q: "Can I still use this for classroom workflow?",
        a: "Yes. Use this structured output as a blueprint, then paste external AI results back into the teaching workflow.",
      },
    ],
    similarExamples: {
      easy: [
        {
          q: `Write one easy ${payload.subject} question on ${topic}.`,
          a: "Ask external AI to answer in 4 short steps with one-line recap.",
        },
      ],
      moderate: [
        {
          q: `Write one moderate ${payload.subject} question on ${topic}.`,
          a: "Ask external AI for stepwise method + common mistake warning.",
        },
      ],
      board: [
        {
          q: `Write one board-level ${payload.subject} question on ${topic}.`,
          a: "Ask external AI for marking-friendly structure and exam keywords.",
        },
      ],
    },
    videos: [
      {
        title: "Concept clarity search",
        query: `${payload.subject} ${topic} explained simply class lesson`,
      },
      {
        title: "Exam-focused walkthrough",
        query: `${payload.subject} ${topic} board exam solved examples`,
      },
      {
        title: "Common mistakes",
        query: `${payload.subject} ${topic} common mistakes students make`,
      },
      {
        title: "Quick revision",
        query: `${payload.subject} ${topic} revision in 10 minutes`,
      },
    ],
  };
}
