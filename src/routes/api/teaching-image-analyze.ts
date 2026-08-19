import { createFileRoute } from "@tanstack/react-router";
import { buildFallbackTeachingImageAnalysis } from "@/lib/teaching-engine/masterImageFallback";

export const Route = createFileRoute("/api/teaching-image-analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          subject?: string;
          chapter?: string;
          topic?: string;
          teachingResponse?: string;
          sourceExtractedText?: string;
          sourceExtractionMetadata?: {
            board?: string;
            classLevel?: string;
            language?: string;
            questionType?: string;
          };
          file?: { name: string; mime: string; dataUrl: string };
        };

        if (!body.file?.dataUrl || !body.file.mime) {
          return new Response("Missing image payload", { status: 400 });
        }

        const extracted = {
          ocrText: body.sourceExtractedText || body.teachingResponse || "",
          subject: body.subject || "Detected Subject",
          board: body.sourceExtractionMetadata?.board || "Unknown",
          classLevel: body.sourceExtractionMetadata?.classLevel || "Unknown",
          chapter: body.chapter || "Detected Chapter",
          topic: body.topic || "Detected Topic",
          questionType: body.sourceExtractionMetadata?.questionType || "Unknown",
          questionTypes: [],
          language: body.sourceExtractionMetadata?.language || "English",
          hasTables: false,
          hasExercises: false,
          examImportance: "Medium",
          formulae: [],
          numericalQuestions: [],
          diagrams: [],
          keywords: [],
        };

        const fallbackInput = [body.sourceExtractedText || "", body.teachingResponse || ""].filter(Boolean).join("\n\n");
        return Response.json(buildFallbackTeachingImageAnalysis(extracted, fallbackInput));
      },
    },
  },
});
