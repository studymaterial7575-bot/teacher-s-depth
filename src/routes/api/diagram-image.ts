import { createFileRoute } from "@tanstack/react-router";

type GeminiPart = { inlineData?: { mimeType?: string; data?: string } };
type GeminiResponse = { candidates?: { content?: { parts?: GeminiPart[] } }[] };

const GEMINI_IMAGE_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent";

export const Route = createFileRoute("/api/diagram-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });

        const { prompt } = (await request.json()) as { prompt: string };

        const upstream = await fetch(GEMINI_IMAGE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Clean educational diagram on a dark background with bright, clearly labeled elements. ${prompt}`,
                  },
                ],
              },
            ],
            responseModalities: ["IMAGE"],
          }),
        });

        if (!upstream.ok) {
          return new Response(await upstream.text(), { status: upstream.status });
        }

        const data = (await upstream.json()) as GeminiResponse;
        const image = data.candidates
          ?.flatMap((candidate) => candidate.content?.parts ?? [])
          .find((part) => part.inlineData?.data);

        if (!image?.inlineData?.data || !image.inlineData.mimeType) {
          return new Response("No image", { status: 500 });
        }

        return Response.json({
          dataUrl: `data:${image.inlineData.mimeType};base64,${image.inlineData.data}`,
        });
      },
    },
  },
});
