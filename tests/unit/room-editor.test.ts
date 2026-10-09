import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { editorSceneSchema, roomDesignSchema } from "@/lib/room-editor";
const layer = () => ({
  id: randomUUID(),
  productId: null,
  assetKey: "sofa",
  x: 200,
  y: 250,
  width: 240,
  height: 180,
  rotation: 0,
});
describe("room editor document boundary", () => {
  it("accepts bounded illustrative layers and requires version for edits", () => {
    const scene = { width: 1000, height: 750, layers: [layer()] };
    expect(editorSceneSchema.safeParse(scene).success).toBe(true);
    expect(
      roomDesignSchema.safeParse({
        title: "Private room",
        backgroundImageId: "owned",
        scene,
      }).success,
    ).toBe(true);
    expect(
      roomDesignSchema.safeParse({
        id: "existing",
        title: "Private room",
        scene,
      }).success,
    ).toBe(false);
  });
  it("rejects external asset URLs and unsupported document properties", () => {
    const scene = {
      width: 1000,
      height: 750,
      layers: [{ ...layer(), imageUrl: "https://untrusted.example/image.svg" }],
    };
    expect(editorSceneSchema.safeParse(scene).success).toBe(false);
    expect(
      roomDesignSchema.safeParse({
        title: "Room",
        backgroundImageId: "owned",
        backgroundUrl: "https://untrusted.example",
        scene: { width: 1000, height: 750, layers: [] },
      }).success,
    ).toBe(false);
  });
  it("rejects duplicate IDs, excessive layers and invalid transforms", () => {
    const l = layer();
    const scene = { width: 1000, height: 750, layers: [l, l] };
    expect(editorSceneSchema.safeParse(scene).success).toBe(false);
    expect(
      editorSceneSchema.safeParse({
        ...scene,
        layers: Array.from({ length: 101 }, layer),
      }).success,
    ).toBe(false);
    for (const bad of [
      { x: -1 },
      { width: 0 },
      { rotation: 361 },
      { assetKey: "unknown" },
    ])
      expect(
        editorSceneSchema.safeParse({ ...scene, layers: [{ ...l, ...bad }] })
          .success,
      ).toBe(false);
  });
});
