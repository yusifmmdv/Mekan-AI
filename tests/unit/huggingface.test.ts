import { afterEach, describe, expect, it, vi } from "vitest";
import { HuggingFaceImageProvider } from "@/lib/huggingface";
import { aiConfigured, freeAi } from "@/lib/config";
import { getImageProvider } from "@/lib/ai";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const enabled = () => { vi.stubEnv("AI_PROVIDER", "huggingface"); vi.stubEnv("HF_TOKEN", "hf_test_never_real"); vi.stubEnv("ALLOW_PAID_AI", "false"); vi.stubEnv("PAID_AI_ENABLED", "false"); };
const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
const stream = (value: string) => new Response(new ReadableStream({ start(controller) { for (let i = 0; i < value.length; i += 13) controller.enqueue(new TextEncoder().encode(value.slice(i, i + 13))); controller.close(); } }));
describe("free ZeroGPU provider", () => {
  it("requires a configured token and never silently calls a paid endpoint", async () => {
    enabled(); vi.stubEnv("HF_TOKEN", ""); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(aiConfigured()).toBe(false); expect(freeAi()).toBe(true); expect(() => getImageProvider()).toThrow();
    await expect(new HuggingFaceImageProvider().edit(Buffer.from("source"), "edit")).rejects.toThrow("HF_TOKEN"); expect(fetch).not.toHaveBeenCalled();
  });
  it("uploads the source, handles chunked progress, disables prompt rewriting and downloads the genuine result", async () => {
    enabled();
    const fetch = vi.fn().mockResolvedValueOnce(json(["/tmp/source.webp"])).mockResolvedValueOnce(json({ event_id: "job-123" })).mockResolvedValueOnce(stream('event: heartbeat\r\ndata: null\r\n\r\nevent: complete\r\ndata: [{"url":"https://qwen-qwen-image-edit.hf.space/gradio_api/file=/tmp/result.png"},120]\r\n\r\n')).mockResolvedValueOnce(new Response("actual-image", { headers: { "Content-Type": "image/png" } }));
    vi.stubGlobal("fetch", fetch); expect(aiConfigured()).toBe(true);
    const result = await new HuggingFaceImageProvider().edit(Buffer.from("source"), "furnish this room");
    expect(result.bytes.toString()).toBe("actual-image"); expect(result.metadata.paidApi).toBe(false);
    const payload = JSON.parse(fetch.mock.calls[1][1].body); expect(payload.data[1]).toBe("furnish this room"); expect(payload.data[6]).toBe(false);
    for (const [url, options] of fetch.mock.calls) { expect(String(url)).toMatch(/^https:\/\/qwen-qwen-image-edit\.hf\.space\//); expect(options.redirect).toBe("error"); }
  });
  it("reports quota exhaustion without replacing the output or retrying another provider", async () => {
    enabled(); const fetch = vi.fn().mockResolvedValueOnce(json(["/tmp/source.webp"])).mockResolvedValueOnce(json({ event_id: "job" })).mockResolvedValueOnce(stream('event: error\ndata: "You exceeded your ZeroGPU quota"\n\n')); vi.stubGlobal("fetch", fetch);
    await expect(new HuggingFaceImageProvider().edit(Buffer.from("source"), "edit")).rejects.toMatchObject({ code: "HF_QUOTA" }); expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("rejects untrusted output URLs before sending the server token", async () => {
    enabled(); const fetch = vi.fn().mockResolvedValueOnce(json(["/tmp/source.webp"])).mockResolvedValueOnce(json({ event_id: "job" })).mockResolvedValueOnce(stream('event: complete\ndata: [{"url":"https://attacker.example/result.png"}]\n\n')); vi.stubGlobal("fetch", fetch);
    await expect(new HuggingFaceImageProvider().edit(Buffer.from("source"), "edit")).rejects.toMatchObject({ code: "HF_OUTPUT_URL" }); expect(fetch).toHaveBeenCalledTimes(3);
  });
});
