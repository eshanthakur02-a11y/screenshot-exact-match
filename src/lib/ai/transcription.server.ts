import { boundedFormData, uploadIdentity } from "@/lib/data/upload.server";

export async function transcribeAudio(request: Request) {
  try {
    await uploadIdentity(request);
  } catch {
    return Response.json({ error: "Sign in before transcribing audio." }, { status: 401 });
  }
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey)
    return Response.json(
      { error: "Voice transcription is not configured. You can still paste a task." },
      { status: 503 },
    );
  try {
    const incoming = await boundedFormData(request, 10 * 1024 * 1024 + 65536);
    const file = incoming.get("file");
    if (!(file instanceof File) || file.size < 2048 || file.size > 10 * 1024 * 1024)
      throw new Error("Choose a complete audio recording between 2 KB and 10 MB.");
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (
      !["wav", "mp3", "m4a", "mp4", "webm", "flac"].includes(ext ?? "") ||
      !(file.type.startsWith("audio/") || file.type === "video/mp4" || file.type === "video/webm")
    )
      throw new Error("Upload WAV, MP3, M4A, MP4, WebM or FLAC audio.");
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("model", "openai/gpt-transcribe");
    form.append("stream", "true");
    form.append("response_format", "json");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: request.signal,
    });
    if (!response.ok) {
      const message =
        response.status === 402
          ? "AI credits are used up. Add credits to continue."
          : response.status === 403
            ? "Transcription access is blocked for this workspace."
            : response.status === 429
              ? "Transcription is busy. Wait before trying again."
              : "Transcription failed. Check the audio file and try again.";
      return Response.json({ error: message }, { status: response.status });
    }
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return Response.json(
      {
        error:
          error instanceof Error && /Choose|Upload|too large/.test(error.message)
            ? error.message
            : "Audio could not be processed. Your tasks have not changed.",
      },
      { status: 400 },
    );
  }
}
