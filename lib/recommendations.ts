type Candidate = {
  id: string;
  price: unknown;
  discountPrice?: unknown;
  roomTypes: string[];
  styles: string[];
  colors: string[];
  width: number | null;
  depth: number | null;
  stock: number;
};
export function recommendProducts<T extends Candidate>(
  products: T[],
  prefs: {
    roomType: string;
    style: string;
    budget: number;
    colors: string[];
    width: number;
    length: number;
  },
) {
  return products
    .filter(
      (p) =>
        p.stock > 0 &&
        Number(p.discountPrice || p.price) <= prefs.budget &&
        p.roomTypes.includes(prefs.roomType) &&
        (!p.width || p.width <= prefs.width * 100) &&
        (!p.depth || p.depth <= prefs.length * 100),
    )
    .map((p) => ({
      product: p,
      score:
        (p.styles.includes(prefs.style) ? 5 : 0) +
        p.colors.filter((c) =>
          prefs.colors.some((pc) => pc.toLowerCase() === c.toLowerCase()),
        ).length *
          2,
    }))
    .sort(
      (a, b) =>
        b.score - a.score || Number(a.product.price) - Number(b.product.price),
    )
    .slice(0, 8)
    .map((p) => p.product);
}
