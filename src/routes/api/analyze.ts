import { createFileRoute } from "@tanstack/react-router";
import { buildLocalCompanionAnalysis } from "@/lib/companion/local-analysis";

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          subject: string;
          text?: string;
          files?: { name: string; mime: string; dataUrl: string }[];
        };
        const result = buildLocalCompanionAnalysis(body);
        return Response.json(result);
      },
    },
  },
});
