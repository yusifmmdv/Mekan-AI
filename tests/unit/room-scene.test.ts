import { describe, it, expect } from "vitest";
import {
  emptyScene,
  historyFor,
  commitScene,
  undoScene,
  redoScene,
  createLayer,
  updateLayer,
  removeLayer,
  assetForProduct,
} from "@/lib/room-scene";
describe("editable furniture scene history", () => {
  it("keeps IDs and product associations through movement, resize, rotation and serialization", () => {
    const layer = createLayer("sofa", "marketplace-sofa");
    const scene = { ...emptyScene(), layers: [layer] };
    const moved = updateLayer(scene, layer.id, {
      x: 420,
      y: 360,
      width: 300,
      height: 210,
      rotation: 45,
    });
    const restored = JSON.parse(JSON.stringify(moved));
    expect(restored.layers[0]).toEqual({
      ...layer,
      x: 420,
      y: 360,
      width: 300,
      height: 210,
      rotation: 45,
    });
    expect(scene.layers[0].x).toBe(500);
  });
  it("deletes only the selected overlay and restores it with undo/redo", () => {
    const a = createLayer("sofa");
    const b = createLayer("chair");
    const scene = { ...emptyScene(), layers: [a, b] };
    const deleted = commitScene(historyFor(scene), removeLayer(scene, a.id));
    expect(deleted.present.layers.map((x) => x.id)).toEqual([b.id]);
    expect(undoScene(deleted).present).toEqual(scene);
    expect(redoScene(undoScene(deleted)).present).toEqual(deleted.present);
  });
  it("drops future edits after a fresh change and caps history", () => {
    let history = historyFor(emptyScene());
    for (let n = 0; n < 60; n++)
      history = commitScene(history, {
        ...emptyScene(),
        layers: [createLayer("table")],
      });
    expect(history.past.length).toBe(50);
    history = commitScene(undoScene(history), {
      ...emptyScene(),
      layers: [createLayer("lamp")],
    });
    expect(history.future).toEqual([]);
    expect(redoScene(history)).toBe(history);
  });
  it("constrains malformed transforms and ignores edits to nonexistent selections", () => {
    const layer = createLayer("bed");
    const scene = { ...emptyScene(), layers: [layer] };
    const next = updateLayer(scene, layer.id, {
      x: Infinity,
      y: 900,
      width: -5,
      height: 9000,
      rotation: 800,
    });
    expect(next.layers[0]).toMatchObject({
      x: 0,
      y: 750,
      width: 8,
      height: 1000,
      rotation: 360,
    });
    expect(updateLayer(scene, "missing", { x: 1 })).toEqual(scene);
  });
  it("uses category-aware illustrative assets instead of claiming exact product rendering", () => {
    expect(
      assetForProduct({
        name: "Luna divan",
        category: { name: "Divanlar", slug: "sofas" },
      }),
    ).toBe("sofa");
    expect(
      assetForProduct({
        name: "Arc lampa",
        category: { name: "İşıqlandırma", slug: "lighting" },
      }),
    ).toBe("lamp");
    expect(createLayer("sofa").productId).toBeNull();
  });
});
