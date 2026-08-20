export type AiPackageFileReference = {
  name: string;
  type?: string;
};

export function buildAiPackageText(prompt: string, sourceFiles: AiPackageFileReference[], ocrText?: string) {
  const imageRefs = sourceFiles.length > 0
    ? sourceFiles
        .map((file) => `- ${file.name}${file.type ? ` (${file.type})` : ""}`)
        .join("\n")
    : "- No original source screenshot/image was attached.";

  const ocrSection = ocrText && ocrText.trim()
    ? `\n\nExtracted/OCR context:\n${ocrText.trim()}`
    : "";

  return `You are receiving a Teacher's Depth prompt package for review.

Generated prompt:\n${prompt.trim()}

Original screenshot(s) / source image(s) preserved with this package:\n${imageRefs}

Important instruction for the receiving AI:
Use the attached original screenshot(s) as the visual ground truth. Do not rely solely on the generated prompt. First inspect the screenshot(s), identify any discrepancy or misunderstanding in the prompt, and then produce the corrected final output.

If the original screenshot(s) and the generated prompt disagree, the screenshot(s) take precedence. Preserve the teacher's intent while correcting any visual or textual misunderstanding before finalizing the answer.${ocrSection}`;
}
