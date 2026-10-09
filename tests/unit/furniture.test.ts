import { describe, expect, it } from "vitest";
import { parseFurniture, matchFurniture, type FurnitureObject } from "@/lib/furniture";
import { demoSamples } from "@/lib/demo-samples";
const sofa: FurnitureObject = { id: "sofa", category: "sofa", label: "sofa", score: 0.8, box: [0.1, 0.3, 0.6, 0.4], productIds: [] };
const product = { id: "good", category: { slug: "sofas" }, stock: 3, price: 300, discountPrice: null, styles: ["Modern"], colors: ["Bej"], roomTypes: ["Living room"] };
const prefs = { roomType: "Living room", style: "Modern", colors: ["Bej"], budget: 500 };
describe("photo furniture matching", () => {
  it("rejects corrupt or out-of-frame hotspots rather than rendering fabricated regions", () => {
    expect(parseFurniture([{ ...sofa, box: [0.8, 0.3, 0.6, 0.4] }])).toEqual([]);
    expect(parseFurniture([{ ...sofa, score: NaN }])).toEqual([]);
    expect(parseFurniture(null)).toEqual([]);
    expect(parseFurniture([sofa])).toEqual([sofa]);
  });
  it("matches the detected category and excludes unavailable, over-budget or wrong-room products", () => {
    const products = [product, { ...product, id: "chair", category: { slug: "chairs" } }, { ...product, id: "empty", stock: 0 }, { ...product, id: "expensive", price: 1000 }, { ...product, id: "wrong-room", roomTypes: ["Office"] }];
    expect(matchFurniture([sofa], products, prefs)[0].productIds).toEqual(["good"]);
  });
  it("uses discounted prices, ranks preferred style and returns no invented product when unmatched", () => {
    const discount = { ...product, id: "discount", price: 900, discountPrice: 400 };
    expect(matchFurniture([sofa], [{ ...product, id: "plain", styles: [], colors: [] }, discount], prefs)[0].productIds).toEqual(["discount", "plain"]);
    expect(matchFurniture([sofa], [], prefs)[0].productIds).toEqual([]);
  });
  it("ships inspected furniture regions for each home, office and studio sample", () => {
    expect(demoSamples.map(s => s.spaceType)).toEqual(["HOME", "OFFICE", "STUDIO"]);
    for (const sample of demoSamples) { expect(sample.objects.length).toBeGreaterThanOrEqual(4); expect(parseFurniture(sample.objects)).toEqual(sample.objects); }
  });
});
