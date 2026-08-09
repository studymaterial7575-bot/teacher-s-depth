import { createFileRoute } from "@tanstack/react-router";

function makeFallbackImageDataUrl(prompt: string) {
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!canvas) {
    return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600"><rect width="100%" height="100%" fill="#183a37"/><rect x="40" y="40" width="1120" height="1520" rx="28" fill="#f8fafc"/><text x="60" y="170" font-size="36" font-family="Arial" fill="#183a37">Master Teaching Image</text><text x="60" y="260" font-size="24" font-family="Arial" fill="#0f172a">${prompt.replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 260)}</text></svg>`).toString("base64")}`;
  }

  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600"><rect width="100%" height="100%" fill="#183a37"/><rect x="40" y="40" width="1120" height="1520" rx="28" fill="#f8fafc"/><text x="60" y="170" font-size="36" font-family="Arial" fill="#183a37">Master Teaching Image</text><text x="60" y="260" font-size="24" font-family="Arial" fill="#0f172a">${prompt.replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 260)}</text></svg>`).toString("base64")}`;

  ctx.fillStyle = "#183a37";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);
  ctx.fillStyle = "#183a37";
  ctx.font = "700 36px Arial";
  ctx.fillText("Master Teaching Image", 60, 150);
  ctx.font = "24px Arial";
  ctx.fillStyle = "#0f172a";
  const lines = prompt.replace(/\s+/g, " ").slice(0, 260).match(/.{1,70}/g) ?? [prompt];
  lines.forEach((line, index) => ctx.fillText(line, 60, 230 + index * 34));
  return canvas.toDataURL("image/png");
}

export const Route = createFileRoute("/api/diagram-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.GEMINI_API_KEY;
        const { prompt } = (await request.json()) as { prompt: string };

        if (!key) {
          return Response.json({ dataUrl: makeFallbackImageDataUrl(prompt) });
        }

        const upstream = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
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
              generationConfig: { responseModalities: ["IMAGE"] },
            }),
          },
        );
        if (!upstream.ok) {
          return Response.json({ dataUrl: makeFallbackImageDataUrl(prompt) });
        }
        const data = (await upstream.json()) as any;
        const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!b64) return Response.json({ dataUrl: makeFallbackImageDataUrl(prompt) });
        return Response.json({ dataUrl: `data:image/png;base64,${b64}` });
      },
    },
  },
});
