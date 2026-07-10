import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/diagram-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });
        const { prompt } = (await request.json()) as { prompt: string };

        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
              generationConfig: { responseModalities: ["IMAGE"] },
            }),
          },
        );
        if (!upstream.ok) {
          return new Response(await upstream.text(), { status: upstream.status });
        }
        const data = (await upstream.json()) as any;
        const imagePart = (data.candidates?.[0]?.content?.parts ?? []).find(
          (p: any) => p.inlineData,
        );
        if (!imagePart) return new Response("No image", { status: 500 });
        const { mimeType, data: b64 } = imagePart.inlineData as {
          mimeType: string;
          data: string;
        };
        return Response.json({ dataUrl: `data:${mimeType};base64,${b64}` });
      },
    },
  },
});
