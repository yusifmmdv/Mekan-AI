import { AppError, assert } from "./errors";
import type { ImageProvider } from "./ai";

// Only the official free ZeroGPU demo is used. No billed Inference Providers API.
const ORIGIN = "https://qwen-qwen-image-edit.hf.space";
export const HF_MODEL = "Qwen/Qwen-Image-Edit";
const MAX_BYTES = 10 * 1024 * 1024;

function providerError(detail: string): AppError {
  if (/quota|exceeded|zerogpu|gpu.*limit/i.test(detail))
    return new AppError(429, "HF_QUOTA", "Pulsuz AI kvotası bitib. Daha sonra yenidən yoxlayın və ya hazır nümunələri açın.");
  return new AppError(503, "HF_UNAVAILABLE", "Pulsuz AI xidməti hazırda əlçatan deyil. Yenidən yoxlayın və ya hazır nümunələri açın.");
}

export class HuggingFaceImageProvider implements ImageProvider {
  async edit(image: Buffer, prompt: string) {
    assert(process.env.HF_TOKEN, 503, "HF_TOKEN", "Pulsuz AI üçün serverdə HF_TOKEN əlavə edilməlidir.");
    const signal = AbortSignal.timeout(8 * 60_000);
    const headers = { Authorization: `Bearer ${process.env.HF_TOKEN}` };
    const form = new FormData();
    form.append("files", new Blob([new Uint8Array(image)], { type: "image/webp" }), "room.webp");
    try {
      const uploaded = await fetch(`${ORIGIN}/gradio_api/upload`, { method: "POST", headers, body: form, signal, redirect: "error" });
      if (!uploaded.ok) throw providerError(await uploaded.text());
      const files: unknown = await uploaded.json();
      assert(Array.isArray(files) && typeof files[0] === "string", 502, "HF_UPLOAD", "AI xidməti şəkli qəbul etmədi.");
      const seed = Math.floor(Math.random() * 2 ** 31);
      const submitted = await fetch(`${ORIGIN}/gradio_api/call/infer`, {
        method: "POST", signal, redirect: "error",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ data: [{ path: files[0], orig_name: "room.webp", meta: { _type: "gradio.FileData" } }, prompt, seed, false, 4, 28, false] }),
      });
      if (!submitted.ok) throw providerError(await submitted.text());
      const job = await submitted.json() as { event_id?: unknown };
      assert(typeof job.event_id === "string" && /^[a-zA-Z0-9_-]+$/.test(job.event_id), 502, "HF_JOB", "AI sorğusu alınmadı.");
      const response = await fetch(`${ORIGIN}/gradio_api/call/infer/${job.event_id}`, { headers, signal, redirect: "error" });
      if (!response.ok || !response.body) throw providerError(await response.text());
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "", event = "", data: string[] = [], output: unknown, streamBytes = 0;
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          streamBytes += chunk.value.byteLength;
          assert(streamBytes <= 4_000_000, 502, "HF_STREAM", "AI cavabı çox böyükdür.");
          pending += decoder.decode(chunk.value, { stream: true });
          assert(pending.length < 2_000_000, 502, "HF_STREAM", "AI cavabı çox böyükdür.");
          let end: number;
          while ((end = pending.indexOf("\n")) !== -1) {
            const line = pending.slice(0, end).replace(/\r$/, "");
            pending = pending.slice(end + 1);
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data.push(line.slice(5).trim());
            else if (!line) {
              if (event === "error") throw providerError(data.join("\n"));
              if (event === "complete") { output = JSON.parse(data.join("\n")); break; }
              event = ""; data = [];
            }
          }
          if (output) break;
        }
      } finally { await reader.cancel().catch(() => {}); }
      const file = Array.isArray(output) ? output[0] as { url?: unknown; path?: unknown } : null;
      assert(file && (typeof file.url === "string" || typeof file.path === "string"), 502, "HF_OUTPUT", "AI şəkil qaytarmadı.");
      const url = typeof file.url === "string" ? new URL(file.url) : new URL(`/gradio_api/file=${encodeURIComponent(String(file.path))}`, ORIGIN);
      assert(url.origin === ORIGIN && !url.username && !url.password && url.pathname.startsWith("/gradio_api/file="), 502, "HF_OUTPUT_URL", "AI şəkil ünvanı etibarlı deyil.");
      const rendered = await fetch(url, { headers, signal, redirect: "error" });
      if (!rendered.ok || !rendered.body) throw providerError("download failed");
      const pieces: Uint8Array[] = [];
      let size = 0;
      const imageReader = rendered.body.getReader();
      try {
        for (;;) {
          const chunk = await imageReader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          assert(size <= MAX_BYTES, 502, "HF_IMAGE_SIZE", "AI şəkli çox böyükdür.");
          pieces.push(chunk.value);
        }
      } finally { await imageReader.cancel().catch(() => {}); }
      return { bytes: Buffer.concat(pieces), mime: rendered.headers.get("content-type")?.split(";")[0] || "image/png", metadata: { provider: "huggingface", model: HF_MODEL, seed, paidApi: false, freeQuota: true } };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw providerError("connection failed");
    }
  }
}
