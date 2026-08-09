import { createFileRoute } from "@tanstack/react-router";
import { buildFallbackTeachingImageAnalysis } from "@/lib/teaching-engine/masterImageFallback";

export const Route = createFileRoute("/api/teaching-image-analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.GEMINI_API_KEY;

        const body = (await request.json()) as {
          subject?: string;
          chapter?: string;
          topic?: string;
          teachingResponse?: string;
          file?: { name: string; mime: string; dataUrl: string };
        };

        if (!body.file?.dataUrl || !body.file.mime) {
          return new Response("Missing image payload", { status: 400 });
        }

        if (!key) {
          const extracted = {
            ocrText: body.teachingResponse || "",
            subject: body.subject || "Detected Subject",
            board: "Unknown",
            classLevel: "Unknown",
            chapter: body.chapter || "Detected Chapter",
            topic: body.topic || "Detected Topic",
            questionType: "Unknown",
            questionTypes: [],
            language: "English",
            hasTables: false,
            hasExercises: false,
            examImportance: "Medium",
            formulae: [],
            numericalQuestions: [],
            diagrams: [],
            keywords: [],
          };
          return Response.json(buildFallbackTeachingImageAnalysis(extracted, body.teachingResponse || ""));
        }

        const commaIdx = body.file.dataUrl.indexOf(",");
        if (commaIdx === -1) {
          return new Response("Invalid data URL", { status: 400 });
        }

        const base64 = body.file.dataUrl.slice(commaIdx + 1);

        const systemPrompt = `You are Teacher's Depth Image Understanding Engine.
Analyze ONE educational master learning image and convert it into teachable structured knowledge.

Rules:
- Do not perform OCR-only extraction. Infer educational meaning, relationships, and teaching order.
- Detect topic hierarchy and conceptual dependencies.
- Keep output classroom-friendly and exam-aware.
- Maintain concise but complete content.
- Preserve a strict boundary between:
  1) SOURCE CONTENT (what appears in supplied material)
  2) IMPORTANT ADDITIONAL EXAM COVERAGE (missing but relevant coverage for same topic)
- Never present additional exam-supporting material as if it came from source.
- If board/class context is unknown, mark added items as general exam-supporting coverage.
- Return JSON only with exact schema.

Schema:
{
  "mainTopic": string,
  "subtopics": string[],
  "sourceContent": string[],
  "additionalExamCoverage": string[],
  "definitions": [{ "title": string, "text": string }],
  "formulae": [{ "formula": string, "meaning": string, "units": string }],
  "workedExamples": [{ "title": string, "problem": string, "steps": string }],
  "diagrams": [{ "title": string, "description": string }],
  "tables": [{ "title": string, "description": string }],
  "importantFacts": string[],
  "examPoints": string[],
  "commonQuestionTypes": string[],
  "commonMistakes": string[],
  "revisionPoints": string[],
  "cards": [{
    "title": string,
    "explanation": string,
    "keyPoints": string[],
    "formula": string,
    "diagram": string,
    "example": string,
    "examImportance": string,
    "commonMistake": string
  }]
}

Card rules:
- Create cards as logical units, not fixed count.
- Keep cards in teaching sequence from fundamentals to revision.
- Include formula/diagram/example fields only when relevant; otherwise empty string.
- keyPoints must be short, student-friendly bullet style phrases.`;

        const context = [
          body.subject ? `Subject: ${body.subject}` : "",
          body.chapter ? `Chapter: ${body.chapter}` : "",
          body.topic ? `Topic: ${body.topic}` : "",
          body.teachingResponse ? `Teaching response context:\n${body.teachingResponse}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const upstream = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `Analyze this master learning image for teaching disintegration and exam-completeness.\n${context}`,
                    },
                    {
                      inlineData: {
                        mimeType: body.file.mime,
                        data: base64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
              },
            }),
          },
        );

        if (!upstream.ok) {
          return new Response(await upstream.text(), { status: upstream.status });
        }

        const data = (await upstream.json()) as any;
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          const match = content.match(/\{[\s\S]*\}/);
          parsed = match ? JSON.parse(match[0]) : { error: "parse_failed", raw: content };
        }

        return Response.json(parsed);
      },
    },
  },
});
