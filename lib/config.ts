export const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Mekan AI";
export const appUrl = process.env.APP_URL || "http://localhost:3000";
export const roomTypes = [
  "Living room",
  "Bedroom",
  "Kitchen",
  "Office",
  "Dining room",
  "Children's room",
] as const;
export const styles = [
  "Modern",
  "Minimalist",
  "Scandinavian",
  "Classic",
  "Luxury",
  "Industrial",
  "Contemporary",
] as const;
export const roomLabels: Record<string, string> = {
  "Living room": "Qonaq otağı",
  Bedroom: "Yataq otağı",
  Kitchen: "Mətbəx",
  Office: "İş otağı",
  "Dining room": "Yemək otağı",
  "Children's room": "Uşaq otağı",
};
export const styleLabels: Record<string, string> = {
  Modern: "Modern",
  Minimalist: "Minimalist",
  Scandinavian: "Skandinaviya",
  Classic: "Klassik",
  Luxury: "Lüks",
  Industrial: "İndustrial",
  Contemporary: "Müasir",
};
export const money = (value: number | string | { toString(): string }) =>
  new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    maximumFractionDigits: 2,
  }).format(Number(value.toString()));
export function localAiUrlValid(value = process.env.LOCAL_AI_URL): boolean {
  try {
    const url = new URL(value || "");
    return (
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}
export const freeAi = () => ["local", "huggingface"].includes(process.env.AI_PROVIDER || "");
export const aiConfigured = () =>
  process.env.AI_PROVIDER === "huggingface" ? !!process.env.HF_TOKEN : process.env.AI_PROVIDER === "local"
    ? localAiUrlValid() && !!process.env.LOCAL_AI_TOKEN
    : process.env.AI_PROVIDER === "openai" &&
      process.env.PAID_AI_ENABLED === "true" &&
      process.env.ALLOW_PAID_AI === "true" &&
      !!process.env.OPENAI_API_KEY;
