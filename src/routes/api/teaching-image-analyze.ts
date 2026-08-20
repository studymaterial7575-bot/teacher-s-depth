import { createFileRoute } from "@tanstack/react-router";
import { buildFallbackTeachingImageAnalysis } from "@/lib/teaching-engine/masterImageFallback";
import {
  filterRelevantFormulaeByContext,
  pickKnownValue,
  sanitizeEducationalLines,
  sanitizeEducationalText,
  sanitizeEducationalTextByContext,
} from "@/lib/teaching-engine/contentIntegrity";

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
          sourceFormulae?: string[];
          sourceNumericalQuestions?: string[];
          sourceExtractionMetadata?: {
            subject?: string;
            board?: string;
            classLevel?: string;
            chapter?: string;
            topic?: string;
            concept?: string;
            language?: string;
            questionType?: string;
          };
          file?: { name: string; mime: string; dataUrl: string };
        };

        if (!body.file?.dataUrl || !body.file.mime) {
          return new Response("Missing image payload", { status: 400 });
        }

        const subject = pickKnownValue(body.subject, body.sourceExtractionMetadata?.subject) || "Detected Subject";
        const chapter = pickKnownValue(body.chapter, body.sourceExtractionMetadata?.chapter) || "Detected Chapter";
        const topic = pickKnownValue(body.topic, body.sourceExtractionMetadata?.topic) || "Detected Topic";
        const baseContext = `${subject} ${body.sourceExtractionMetadata?.board || ""} ${body.sourceExtractionMetadata?.classLevel || ""} ${chapter} ${topic}`;
        const cleanedSourceText = sanitizeEducationalTextByContext(body.sourceExtractedText || body.teachingResponse || "", baseContext);
        const cleanedTeachingResponse = sanitizeEducationalTextByContext(body.teachingResponse || "", `${baseContext} ${cleanedSourceText}`);
        const formulaContext = `${baseContext} ${cleanedSourceText} ${cleanedTeachingResponse}`;
        const sourceFormulae = filterRelevantFormulaeByContext(body.sourceFormulae ?? [], formulaContext);
        const sourceNumericalQuestions = sanitizeEducationalLines(body.sourceNumericalQuestions ?? [], 8);

        const extracted = {
          ocrText: cleanedSourceText || cleanedTeachingResponse,
          subject,
          board: body.sourceExtractionMetadata?.board || "Unknown",
          classLevel: body.sourceExtractionMetadata?.classLevel || "Unknown",
          chapter,
          topic,
          concept: pickKnownValue(body.sourceExtractionMetadata?.concept) || "Not identified",
          questionType: body.sourceExtractionMetadata?.questionType || "Unknown",
          questionTypes: [],
          language: body.sourceExtractionMetadata?.language || "English",
          hasTables: false,
          hasExercises: false,
          examImportance: "Medium",
          formulae: sourceFormulae,
          numericalQuestions: sourceNumericalQuestions,
          diagrams: [],
          keywords: [],
        };

        const fallbackInput = [cleanedSourceText, cleanedTeachingResponse].filter(Boolean).join("\n\n");
        return Response.json(buildFallbackTeachingImageAnalysis(extracted, fallbackInput));
      },
    },
  },
});
