import { expect, it } from "vitest";
import { encodeWav } from "./record-wav";
it("encodes a complete PCM WAV recording", async () => {
  const blob = encodeWav([new Float32Array([0, 1, -1])], 16000);
  expect(blob.type).toBe("audio/wav");
  expect(blob.size).toBe(50);
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      reader.result instanceof ArrayBuffer
        ? resolve(reader.result)
        : reject(new Error("Expected WAV bytes"));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
  const view = new DataView(bytes);
  expect(view.getUint32(24, true)).toBe(16000);
  expect(view.getUint32(40, true)).toBe(6);
  expect(view.getInt16(46, true)).toBe(32767);
});
