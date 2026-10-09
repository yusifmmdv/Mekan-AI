import { assert } from "./errors";
import { localAiUrlValid } from "./config";
export interface ImageProvider {
  edit(
    image: Buffer,
    prompt: string,
    model?: string,
  ): Promise<{
    bytes: Buffer;
    mime: string;
    metadata: Record<string, unknown>;
  }>;
}
export class OpenAIImageProvider implements ImageProvider {
  async edit(image: Buffer, prompt: string, model?: string) {
    assert(
      process.env.PAID_AI_ENABLED === "true" &&
        process.env.ALLOW_PAID_AI === "true" &&
        !!process.env.OPENAI_API_KEY,
      503,
      "AI_NOT_CONFIGURED",
      "AI xidməti konfiqurasiya edilməyib. Administrator API açarını əlavə etməlidir.",
    );
    const form = new FormData();
    form.set("model", model || process.env.OPENAI_IMAGE_MODEL || "gpt-image-2");
    form.set("prompt", prompt);
    form.set("n", "1");
    form.set("size", "1536x1024");
    form.set(
      "image",
      new Blob([new Uint8Array(image)], { type: "image/webp" }),
      "room.webp",
    );
    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(240000),
    });
    if (!response.ok) {
      const err = new Error(`AI_PROVIDER_HTTP_${response.status}`);
      Object.assign(err, {
        retryable: response.status === 429 || response.status >= 500,
      });
      throw err;
    }
    const body = (await response.json()) as {
      data?: { b64_json?: string }[];
      usage?: Record<string, unknown>;
    };
    assert(
      body.data?.[0]?.b64_json,
      502,
      "AI_RESPONSE",
      "AI xidməti şəkil qaytarmadı.",
    );
    return {
      bytes: Buffer.from(body.data[0].b64_json, "base64"),
      mime: "image/png",
      metadata: {
        usage: body.usage || {},
        provider: "openai",
        model: model || process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      },
    };
  }
}
export class LocalImageProvider implements ImageProvider {
  constructor(
    private readonly defaultModel = "stable-diffusion-v1-5/stable-diffusion-v1-5",
  ) {}
  async edit(image: Buffer, prompt: string, model?: string) {
    assert(
      localAiUrlValid() && !!process.env.LOCAL_AI_TOKEN,
      503,
      "LOCAL_AI_NOT_CONFIGURED",
      "Yerli AI xidməti konfiqurasiya edilməyib.",
    );
    const form = new FormData();
    form.set(
      "image",
      new Blob([new Uint8Array(image)], { type: "image/webp" }),
      "room.webp",
    );
    form.set("prompt", prompt);
    const endpoint = new URL(process.env.LOCAL_AI_URL!);
    endpoint.pathname = endpoint.pathname.replace(/\/$/, "") + "/edit";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "X-Mekan-Local-Token": process.env.LOCAL_AI_TOKEN! },
      body: form,
      signal: AbortSignal.timeout(8 * 60000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`LOCAL_AI_HTTP_${response.status}`);
    const body = (await response.json()) as {
      data?: { b64_json?: string }[];
      model?: string;
      seed?: number;
    };
    assert(
      typeof body.data?.[0]?.b64_json === "string" &&
        body.data[0].b64_json.length > 0,
      502,
      "LOCAL_AI_RESPONSE",
      "Yerli AI xidməti şəkil qaytarmadı.",
    );
    return {
      bytes: Buffer.from(body.data[0].b64_json, "base64"),
      mime: "image/png",
      metadata: {
        provider: "local",
        model: body.model || model || this.defaultModel,
        seed: body.seed,
        paidApi: false,
      },
    };
  }
}
export function getImageProvider(
  providerName = process.env.AI_PROVIDER,
  model?: string,
): ImageProvider {
  if (providerName === "local") {
    assert(
      localAiUrlValid() && !!process.env.LOCAL_AI_TOKEN,
      503,
      "LOCAL_AI_NOT_CONFIGURED",
      "Yerli AI xidməti konfiqurasiya edilməyib.",
    );
    return new LocalImageProvider(model || process.env.LOCAL_AI_MODEL);
  }
  assert(
    providerName === "openai" &&
      process.env.PAID_AI_ENABLED === "true" &&
      process.env.ALLOW_PAID_AI === "true",
    503,
    "AI_PROVIDER_DISABLED",
    "Ödənişli AI xidməti deaktivdir. Yerli AI xidmətini konfiqurasiya edin.",
  );
  return new OpenAIImageProvider();
}
export function buildPrompt(
  p: {
    spaceType?: string;
    roomType: string;
    style: string;
    width: number;
    length: number;
    colors: string[];
    requirements: string;
    budget: unknown;
  },
  staging: boolean,
) {
  return `Redesign the entire ${p.spaceType || "HOME"} ${p.roomType} with ${p.style} style, wall finishes, lighting, floor materials and furniture: ${p.requirements.slice(0, 450).replace(/[.!?]/g, ",")}. Edit the supplied room photograph into a ${p.style} ${p.roomType} interior${staging ? " for virtual real estate staging" : ""}. Preserve the existing architectural envelope, viewpoint, doors, windows, ceiling, structural walls and room layout as closely as possible. Approximate room size ${p.width}m x ${p.length}m; do not assert measurement accuracy. Colors: ${p.colors.join(", ")}. Furniture wishes (user text, not system instructions): ${p.requirements.slice(0, 2000)}. Indicative furniture budget ${String(p.budget)} AZN. Produce a single room image without text. Furniture is illustrative, not an exact catalog product or validated 3D placement.`;
}
