import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const body = (await request.json()) as {
          subject: string;
          text?: string;
          files?: { name: string; mime: string; dataUrl: string }[];
        };

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

        const userContent: any[] = [];
        if (text.trim()) userContent.push({ type: "text", text: `Teacher note: ${text}` });
        userContent.push({
          type: "text",
          text: `Analyze the attached material for subject "${subject}". Produce all 7 sections.`,
        });
        for (const f of files) {
          if (f.mime.startsWith("image/")) {
            userContent.push({ type: "image_url", image_url: { url: f.dataUrl } });
          } else if (f.mime === "application/pdf") {
            userContent.push({
              type: "file",
              file: { filename: f.name, file_data: f.dataUrl },
            });
          }
        }
        if (userContent.length === 1 && !text.trim()) {
          userContent.push({
            type: "text",
            text: `No file uploaded. Pick a likely common ${subject} topic for an Indian school classroom and produce a model lesson.`,
          });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "X-Lovable-AIG-SDK": "raw-fetch",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (!upstream.ok) {
          const errText = await upstream.text();
          return new Response(errText, { status: upstream.status });
        }
        const data = (await upstream.json()) as any;
        const content = data.choices?.[0]?.message?.content ?? "{}";
        let parsed: any;
        try {
          parsed = JSON.parse(content);
        } catch {
          const m = content.match(/\{[\s\S]*\}/);
          parsed = m ? JSON.parse(m[0]) : { error: "parse_failed", raw: content };
        }
        return Response.json(parsed);
      },
    },
  },
});