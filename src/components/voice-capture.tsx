import { useEffect, useRef, useState } from "react";
import { createParser } from "eventsource-parser";
import { Mic, Square, Upload } from "lucide-react";
import { authenticatedUpload } from "@/lib/upload-client";
import { recordWav } from "@/lib/record-wav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VoiceCapture({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled: boolean;
}) {
  const [recording, setRecording] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<Awaited<ReturnType<typeof recordWav>> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      const active = recorder.current;
      recorder.current = null;
      if (active) void active.stop().catch(() => {});
    },
    [],
  );
  async function transcribe(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (file.size > 10 * 1024 * 1024 || file.size < 2048)
        throw new Error("Choose a complete audio note between 2 KB and 10 MB.");
      const form = new FormData();
      form.append("file", file);
      const response = await authenticatedUpload("/api/transcribe", form);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Transcription failed.");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No transcription received.");
      let finalText: string | null = null,
        streamError: string | null = null;
      const parser = createParser({
        onEvent: (event) => {
          if (event.data === "[DONE]") return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "transcript.text.done") finalText = data.text;
            if (data.type === "error" || data.error)
              streamError = "Transcription failed. Please check the recording.";
          } catch {
            streamError = "An unreadable transcription was received.";
          }
        },
      });
      const decoder = new TextDecoder();
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        parser.feed(decoder.decode(next.value, { stream: true }));
      }
      parser.feed(decoder.decode());
      if (streamError) throw new Error(streamError);
      if (!finalText || !String(finalText).trim())
        throw new Error(
          "No speech was detected, or transcription was interrupted. Try a complete recording.",
        );
      onTranscript(String(finalText));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audio could not be transcribed.");
    } finally {
      setBusy(false);
    }
  }
  async function stop() {
    const active = recorder.current;
    recorder.current = null;
    setRecording(false);
    if (timer.current) clearTimeout(timer.current);
    if (!active) return;
    try {
      await transcribe(await active.stop());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recording could not be completed.");
    }
  }
  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Recording is unavailable in this browser. Upload an audio file instead.");
      return;
    }
    setBusy(true);
    try {
      recorder.current = await recordWav();
      setRecording(true);
      timer.current = setTimeout(() => void stop(), 60000);
    } catch {
      setError(
        "Microphone permission was denied or no microphone is available. Allow access or upload audio.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="relative space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || busy}
          onClick={recording ? stop : start}
        >
          {recording ? <Square /> : <Mic />}
          {recording ? "Stop recording" : "Record voice note"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled || busy || recording}
          onClick={() => uploadRef.current?.click()}
        >
          <Upload />
          {busy ? "Transcribing…" : "Upload audio"}
        </Button>
        <Input
          ref={uploadRef}
          type="file"
          className="hidden"
          accept=".wav,.mp3,.m4a,.mp4,.webm,.flac"
          aria-label="Audio note"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void transcribe(file);
            e.target.value = "";
          }}
        />
      </div>
      {recording && <p className="text-xs text-muted-foreground">Recording · up to 60 seconds</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
