import { createFileRoute } from "@tanstack/react-router";

type DiagramImageRequestBody = {
  prompt: string;
};

type GeminiImageResponsePart = {
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
};

type GeminiImageGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiImageResponsePart[];
    };
  }>;
};

export const Route = createFileRoute("/api/diagram-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });

        const { prompt } = (await request.json()) as DiagramImageRequestBody;

        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `Clean educational diagram on a dark background with bright, clearly labeled elements. ${prompt}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ["TEXT", "IMAGE"],
              },
            }),
          },
        );

        if (!upstream.ok) {
          return new Response(await upstream.text(), { status: upstream.status });
        }

        const data = (await upstream.json()) as GeminiImageGenerateContentResponse;
        const inlineData = data.candidates
          ?.flatMap((candidate) => candidate.content?.parts ?? [])
          .find((part) => part.inlineData?.data)?.inlineData;

        if (!inlineData?.data) return new Response("No image", { status: 500 });
        const mimeType = inlineData.mimeType || "image/png";
        return Response.json({ dataUrl: `data:${mimeType};base64,${inlineData.data}` });
      },
    },
  },
});
