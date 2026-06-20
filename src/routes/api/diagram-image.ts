import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/diagram-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const { prompt } = (await request.json()) as { prompt: string };

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            prompt: `Clean educational diagram on a dark background with bright, clearly labeled elements. ${prompt}`,
            size: "1024x1024",
            n: 1,
          }),
        });
        if (!upstream.ok) {
          return new Response(await upstream.text(), { status: upstream.status });
        }
        const data = (await upstream.json()) as any;
        const b64 = data.data?.[0]?.b64_json;
        if (!b64) return new Response("No image", { status: 500 });
        return Response.json({ dataUrl: `data:image/png;base64,${b64}` });
      },
    },
  },
});