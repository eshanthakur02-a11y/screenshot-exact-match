import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/transcribe")({ server: { handlers: { POST: async ({ request }) => {
  const { transcribeAudio } = await import("@/lib/ai/transcription.server");
  return transcribeAudio(request);
} } } });