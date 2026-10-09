import { afterEach, describe, it, expect, vi } from "vitest";
import {
  LocalImageProvider,
  OpenAIImageProvider,
  getImageProvider,
} from "@/lib/ai";
import { aiConfigured, localAiUrlValid } from "@/lib/config";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const local = () => {
  vi.stubEnv("AI_PROVIDER", "local");
  vi.stubEnv("LOCAL_AI_URL", "http://127.0.0.1:7861");
  vi.stubEnv("LOCAL_AI_TOKEN", "test-token-never-paid");
  vi.stubEnv("ALLOW_PAID_AI", "false");
};
describe("provider spending and routing boundaries", () => {
  it("blocks paid calls even when legacy opt-in and a key are present", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("ALLOW_PAID_AI", "true");
    vi.stubEnv("PAID_AI_ENABLED", "false");
    expect(aiConfigured()).toBe(false);
    expect(() => getImageProvider("openai")).toThrow();
    await expect(
      new OpenAIImageProvider().edit(Buffer.from("image"), "room"),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("refuses paid OpenAI with a key unless explicitly enabled, before any fetch", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("ALLOW_PAID_AI", "false");
    expect(aiConfigured()).toBe(false);
    expect(() => getImageProvider("openai")).toThrow();
    await expect(
      new OpenAIImageProvider().edit(Buffer.from("image"), "room"),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("refuses unknown providers and remote/local URL tricks", () => {
    local();
    expect(() => getImageProvider("unknown")).toThrow();
    for (const url of [
      "https://example.com",
      "http://192.168.1.1:7861",
      "http://127.0.0.1.example.com",
      "http://user:pass@localhost:7861",
      "http://localhost:7861?redirect=x",
      "http://localhost:7861#fragment",
    ])
      expect(localAiUrlValid(url), url).toBe(false);
    for (const url of [
      "http://127.0.0.1:7861",
      "http://localhost:7861",
      "http://[::1]:7861",
    ])
      expect(localAiUrlValid(url), url).toBe(true);
    vi.stubEnv("LOCAL_AI_URL", "https://remote.example");
    expect(aiConfigured()).toBe(false);
    expect(() => getImageProvider("local")).toThrow();
  });
  it("calls only authenticated loopback /edit and decodes local result", async () => {
    local();
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [{ b64_json: Buffer.from("local-image").toString("base64") }],
            model: "local-test",
            seed: 123,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    expect(getImageProvider("local")).toBeInstanceOf(LocalImageProvider);
    const result = await new LocalImageProvider().edit(
      Buffer.from("source"),
      "room prompt",
    );
    expect(result.bytes.toString()).toBe("local-image");
    expect(result.mime).toBe("image/png");
    expect(result.metadata.provider).toBe("local");
    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toBe("http://127.0.0.1:7861/edit");
    expect(options.headers["X-Mekan-Local-Token"]).toBe(
      "test-token-never-paid",
    );
    expect(options.redirect).toBe("error");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("prompt")).toBe("room prompt");
    expect(String(url)).not.toContain("openai");
  });
  it("propagates local HTTP failures and empty results without success", async () => {
    local();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(
      new LocalImageProvider().edit(Buffer.from("source"), "prompt"),
    ).rejects.toThrow();
    await expect(
      new LocalImageProvider().edit(Buffer.from("source"), "prompt"),
    ).rejects.toThrow();
    expect(
      fetch.mock.calls.every(([url]) =>
        String(url).startsWith("http://127.0.0.1:7861/"),
      ),
    ).toBe(true);
  });
});
