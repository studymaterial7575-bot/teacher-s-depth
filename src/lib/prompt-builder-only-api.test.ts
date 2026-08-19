import { describe, expect, it, vi } from "vitest";
import { Route as AnalyzeRoute } from "@/routes/api/analyze";
import { Route as DiagramImageRoute } from "@/routes/api/diagram-image";
import { Route as TeachingImageAnalyzeRoute } from "@/routes/api/teaching-image-analyze";

function getPostHandler(route: unknown) {
  const maybeRoute = route as {
    options?: {
      server?: {
        handlers?: {
          POST?: (ctx: { request: Request }) => Promise<Response> | Response;
        };
      };
    };
  };

  const handler = maybeRoute.options?.server?.handlers?.POST;
  if (!handler) {
    throw new Error("POST handler not found on route");
  }
  return handler;
}

describe("prompt-builder-only API routes", () => {
  it("/api/analyze returns local analysis without outbound AI fetch", async () => {
    const outboundFetch = vi.fn(async () => new Response("should not be called"));
    vi.stubGlobal("fetch", outboundFetch);

    const handler = getPostHandler(AnalyzeRoute);
    const response = await handler({
      request: new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Mathematics",
          text: "Class 8 linear equations",
          files: [],
        }),
      }),
    });

    const payload = (await response.json()) as { topic?: string; solution?: string };

    expect(response.status).toBe(200);
    expect(payload.topic).toContain("Mathematics");
    expect(payload.solution).toContain("Prompt-builder mode is active");
    expect(outboundFetch).not.toHaveBeenCalled();
  });

  it("/api/diagram-image returns local image without outbound AI fetch", async () => {
    const outboundFetch = vi.fn(async () => new Response("should not be called"));
    vi.stubGlobal("fetch", outboundFetch);

    const handler = getPostHandler(DiagramImageRoute);
    const response = await handler({
      request: new Request("http://localhost/api/diagram-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Simple triangle area diagram" }),
      }),
    });

    const payload = (await response.json()) as { dataUrl?: string };

    expect(response.status).toBe(200);
    expect(payload.dataUrl?.startsWith("data:image/")).toBe(true);
    expect(outboundFetch).not.toHaveBeenCalled();
  });

  it("/api/teaching-image-analyze returns local structured analysis without outbound AI fetch", async () => {
    const outboundFetch = vi.fn(async () => new Response("should not be called"));
    vi.stubGlobal("fetch", outboundFetch);

    const handler = getPostHandler(TeachingImageAnalyzeRoute);
    const response = await handler({
      request: new Request("http://localhost/api/teaching-image-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Science",
          chapter: "Light",
          topic: "Reflection",
          teachingResponse: "Explain reflection with one real-life example.",
          sourceExtractedText: "Class 8 science chapter on reflection.",
          file: {
            name: "image.png",
            mime: "image/png",
            dataUrl: "data:image/png;base64,AAA",
          },
        }),
      }),
    });

    const payload = (await response.json()) as { cards?: unknown[]; mainTopic?: string };

    expect(response.status).toBe(200);
    expect(payload.mainTopic).toBeTruthy();
    expect((payload.cards?.length ?? 0) > 0).toBe(true);
    expect(outboundFetch).not.toHaveBeenCalled();
  });
});
