import { createFileRoute } from "@tanstack/react-router";

type AnalyzeRequestFile = {
  name: string;
  mime: string;
  dataUrl: string;
};

type AnalyzeRequestBody = {
  subject: string;
  text?: string;
  files?: AnalyzeRequestFile[];
};

type GeminiPart =
  | { text: string }
  | {
      inlineData: {
        mimeType: string;
        data: string;
      };
    };

type GeminiTextResponsePart = {
  text?: string;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiTextResponsePart[];
    };
  }>;
};

function toInlineDataPart(file: AnalyzeRequestFile): GeminiPart | null {
  const match = file.dataUrl.match(/^data:([^;,]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return {
    inlineData: {
      mimeType: file.mime || match[1],
      data: match[2],
    },
  };
}

function parseModelJson(content: string): unknown {
  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(normalized);
  } catch {
    const match = normalized.match(/\{[\s\S]*\}/);
    return match
      ? JSON.parse(match[0])
      : {
          error: "parse_failed",
          message: "Failed to parse JSON response from model",
          raw: content,
        };
  }
}

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });

        const body = (await request.json()) as AnalyzeRequestBody;
        const { subject, text = "", files = [] } = body;

        const systemPrompt = `You are "Teacher Companion", a supplementary depth engine for school teachers in India.
Subject: ${subject}.
The teacher uploads a PDF/screenshot of a textbook question (and/or a short hint). You produce a deep, structured response.

Pedagogy rules (apply to every section):
- WHY comes BEFORE the formula. Explain intuition and real-life meaning first, then introduce the formula.
- Show the PATTERN before the complexity. Lead with the simplest case students can spot, then extend.
- Prefer DAILY-LIFE examples (rotis, rupees, marks, cricket, school bus, rain, mobile recharge, kirana shop).
- Students love simple explanations. Keep sentences short. Avoid jargon.
- Language: allow English, allow simple Hindi (Devanagari script), allow mixed English-Hindi (Hinglish). Pick whatever the student will understand best for the topic and subject. For Hindi/Marathi subjects, lean into the native script. For others, English-first with a short Hindi line is great.

Section rules:
- Respond ONLY with strict JSON matching the schema below. No markdown fences, no commentary.
- Visual diagrams are COMPULSORY. Provide at least one inline SVG diagram — single, or multiple dissected diagrams that break the idea into parts. Each SVG must be self-contained, valid <svg> with viewBox, no external refs. Use stroke="currentColor" and fill where appropriate so it works on a dark background. Include labels via <text>. Keep width<=400.
- Simple Examples are COMPULSORY. ALWAYS provide 2 to 4 examples. Start with very small numbers, then larger. Pattern before complexity. Daily-life context preferred. Show worked steps in short, friendly language.
- WHY: background, intuition, real-life meaning. Plain language. Comes before any formula in the solution.
- Common Doubts: predict 3-5 common student doubts and answer them crisply.
- Similar Examples: Easy, Moderate, Board-level practice questions with brief answers.
- Videos: suggest 4 specific YouTube search queries (English or Hinglish) most likely to find good explainers. Include a short title for each.
- Keep everything concise but pedagogically rich. Plain text with line breaks (\\n) — no markdown headings.
- If the input is unclear, infer the likely textbook topic from the subject and visible content; still produce all sections.

Importance rating (REQUIRED, applies to the whole question/topic):
- "importanceStars": integer 2, 3, 4, or 5.
  5 = Very Important (must solve, very high probability in exams)
  4 = Important (high probability, good for periodic tests)
  3 = Moderate (good for periodic tests / practice)
  2 = Optional (can skip if short of time)
- "importanceLabel": one of "Very Important", "Important", "Moderate", "Optional" — must match the stars.
- "teacherNote": one short sentence the teacher can read aloud, picked from:
    5 -> "Must solve."
    4 -> "High probability."
    3 -> "Good for periodic tests."
    2 -> "Can skip if short of time."
  You may add a 3-6 word reason after it, e.g. "Must solve. Core board concept."

JSON schema:
{
  "topic": string,
  "importanceStars": 2 | 3 | 4 | 5,
  "importanceLabel": "Very Important" | "Important" | "Moderate" | "Optional",
  "teacherNote": string,
  "solution": string,
  "diagrams": [ { "title": string, "svg": string, "caption": string } ],
  "simpleExamples": [ { "title": string, "problem": string, "steps": string } ],
  "why": string,
  "doubts": [ { "q": string, "a": string } ],
  "similarExamples": {
    "easy": [ { "q": string, "a": string } ],
    "moderate": [ { "q": string, "a": string } ],
    "board": [ { "q": string, "a": string } ]
  },
  "videos": [ { "title": string, "query": string } ]
}`;

        const userParts: GeminiPart[] = [];
        if (text.trim()) userParts.push({ text: `Teacher note: ${text}` });
        userParts.push({
          text: `Analyze the attached material for subject "${subject}". Produce all 7 sections.`,
        });

        for (const file of files) {
          if (file.mime.startsWith("image/") || file.mime === "application/pdf") {
            const inlineDataPart = toInlineDataPart(file);
            if (inlineDataPart) userParts.push(inlineDataPart);
          }
        }

        if (userParts.length === 1 && !text.trim()) {
          userParts.push({
            text: `No file uploaded. Pick a likely common ${subject} topic for an Indian school classroom and produce a model lesson.`,
          });
        }

        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  role: "user",
                  parts: userParts,
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
              },
            }),
          },
        );

        if (!upstream.ok) {
          const errText = await upstream.text();
          return new Response(errText, { status: upstream.status });
        }

        const data = (await upstream.json()) as GeminiGenerateContentResponse;
        const content =
          data.candidates
            ?.flatMap((candidate) => candidate.content?.parts ?? [])
            .map((part) => part.text ?? "")
            .join("")
            .trim() ?? "{}";

        return Response.json(parseModelJson(content));
      },
    },
  },
});
