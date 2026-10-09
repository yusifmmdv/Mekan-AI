import "dotenv/config";
import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";

const origin = "http://127.0.0.1:3000";
const editorMode = process.argv.includes("--editor");
mkdirSync(".local-ai/logs", { recursive: true });
function start(script) {
  const log = openSync(`.local-ai/logs/${script.replace(":", "-")}.log`, "a");
  const child = spawn("npm", ["run", script], {
    cwd: process.cwd(),
    detached: true,
    stdio: ["ignore", log, log],
  });
  child.unref();
  console.log(`${script}: başladıldı. Jurnal: .local-ai/logs/`);
}
async function ready(url, headers = {}) {
  try {
    return (await fetch(url, { headers, signal: AbortSignal.timeout(3000) }))
      .ok;
  } catch {
    return false;
  }
}
async function waitFor(url, headers = {}) {
  for (let i = 0; i < 60; i++) {
    if (await ready(url, headers)) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Xidmət başlamadı. .local-ai/logs/ jurnallarını yoxlayın.");
}
let browser;
try {
  if (
    process.env.PAID_AI_ENABLED === "true" ||
    process.env.ALLOW_PAID_AI === "true" ||
    (!editorMode && process.env.AI_PROVIDER !== "local")
  )
    throw new Error(
      "Demo pulsuz lokal AI tələb edir: AI_PROVIDER=local, ALLOW_PAID_AI=false.",
    );
  if (!editorMode) {
    const headers = { "X-Mekan-Local-Token": process.env.LOCAL_AI_TOKEN || "" };
    if (!(await ready("http://127.0.0.1:7861/health", headers)))
      start("ai:local");
    await waitFor("http://127.0.0.1:7861/health", headers);
    try {
      execFileSync("pgrep", ["-f", "[t]sx scripts/worker.ts"], {
        stdio: "ignore",
      });
    } catch {
      start("worker");
    }
  }
  if (!(await ready(`${origin}/studio`))) start("dev");
  await waitFor(`${origin}/studio`);
  if (!process.env.SEED_DEMO_PASSWORD)
    throw new Error(
      "Demo hesabı üçün SEED_DEMO_PASSWORD təyin edin və npm run db:seed işlədin.",
    );
  browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const response = await context.request.post(`${origin}/api/auth/login`, {
    headers: { origin },
    data: {
      email: "customer@demo.mekan.test",
      password: process.env.SEED_DEMO_PASSWORD,
    },
  });
  if (!response.ok())
    throw new Error(
      "Demo hesabına giriş alınmadı. Seed və verilənlər bazasını yoxlayın.",
    );
  const page = await context.newPage();
  await page.goto(`${origin}${editorMode ? "/room-editor" : "/studio"}`);
  // A real saved result is available separately; it is never passed off as a new generation.
  const history = await context.newPage();
  let historyUrl = "/dashboard/projects";
  if (editorMode) {
    const list = await context.request.get(`${origin}/api/room-editor`);
    const saved = list.ok() ? (await list.json()).data.items[0] : null;
    historyUrl = saved ? `/room-editor?id=${saved.id}` : "/room-editor";
  }
  await history.goto(`${origin}${historyUrl}`);
  await page.bringToFront();
  console.log(
    editorMode
      ? "Hazırdır! Birinci pəncərə: yeni 2D otaq. İkinci: saxlanmış mebel dizaynı."
      : "Hazırdır! Birinci pəncərə: yeni AI dizayn. İkinci: saxlanmış real nəticələr.",
  );
  console.log(
    editorMode
      ? "2D redaktor AI xidməti və API çağırışı tələb etmir."
      : "Pulsuz lokal generasiya; kompüteri yuxu rejiminə keçirməyin.",
  );
  await new Promise((resolve) => browser.on("disconnected", resolve));
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Demo başlaya bilmədi.",
  );
  if (browser) await browser.close();
  process.exitCode = 1;
}
