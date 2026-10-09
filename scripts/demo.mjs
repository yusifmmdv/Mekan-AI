import "dotenv/config";
import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
const origin = new URL(process.env.APP_URL || "http://localhost:3000").origin;
mkdirSync(".local-ai/logs", { recursive: true });
function start(script) {
  const log = openSync(`.local-ai/logs/${script.replace(":", "-")}.log`, "a");
  const child = spawn("npm", ["run", script], { cwd: process.cwd(), detached: true, stdio: ["ignore", log, log] });
  child.unref(); console.log(`${script}: başladıldı.`);
}
async function ready(url, headers = {}) {
  try { return (await fetch(url, { headers, signal: AbortSignal.timeout(3000) })).ok; } catch { return false; }
}
async function waitFor(url, headers = {}) {
  for (let i = 0; i < 60; i++) { if (await ready(url, headers)) return; await new Promise(r => setTimeout(r, 1000)); }
  throw new Error("Xidmət başlamadı. .local-ai/logs/ jurnallarını yoxlayın.");
}
let browser;
try {
  if (process.env.PAID_AI_ENABLED === "true" || process.env.ALLOW_PAID_AI === "true") throw new Error("Demo üçün ödənişli API flag-ləri false olmalıdır.");
  if (process.env.AI_PROVIDER === "local") {
    const headers = { "X-Mekan-Local-Token": process.env.LOCAL_AI_TOKEN || "" };
    if (!(await ready("http://127.0.0.1:7861/health", headers))) start("ai:local");
    await waitFor("http://127.0.0.1:7861/health", headers);
  }
  try { execFileSync("pgrep", ["-f", "[t]sx scripts/worker.ts"], { stdio: "ignore" }); } catch { start("worker"); }
  if (!(await ready(`${origin}/examples`))) start("dev");
  await waitFor(`${origin}/examples`);
  try { browser = await chromium.launch({ headless: false, channel: "chrome" }); }
  catch { browser = await chromium.launch({ headless: false }); }
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  if (process.env.SEED_DEMO_PASSWORD) {
    const response = await context.request.post(`${origin}/api/auth/login`, { headers: { origin }, data: { email: "customer@demo.mekan.test", password: process.env.SEED_DEMO_PASSWORD } });
    if (!response.ok()) console.log("Demo giriş alınmadı. Nümunələr açılır; tam axın üçün npm run demo:setup işlədin.");
  }
  const page = await context.newPage(); await page.goto(`${origin}/examples`);
  const studio = await context.newPage(); await studio.goto(`${origin}/studio`);
  await page.bringToFront();
  console.log(`Hazırdır: ${origin}/examples — hover; ikinci pəncərə — canlı AI.`);
  if (process.env.AI_PROVIDER === "huggingface" && !process.env.HF_TOKEN) console.log("Canlı AI üçün .env faylına pulsuz HF_TOKEN əlavə edin və worker/app-i yenidən başladın.");
  await new Promise(resolve => browser.on("disconnected", resolve));
} catch (error) { console.error(error instanceof Error ? error.message : "Demo başlamadı."); if (browser) await browser.close(); process.exitCode = 1; }
