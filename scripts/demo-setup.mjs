import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { Pool } from "pg";
if (!existsSync(".env")) {
  const template = readFileSync(".env.example", "utf8");
  writeFileSync(".env", template.replace(/^SEED_DEMO_PASSWORD=.*$/m, `SEED_DEMO_PASSWORD=${randomBytes(18).toString("hex")}`).replace(/^LOCAL_AI_TOKEN=.*$/m, `LOCAL_AI_TOKEN=${randomBytes(24).toString("hex")}`), { mode: 0o600 });
  console.log(".env yaradıldı. Demo şifrəsi bu faylda saxlanılıb.");
}
config({ quiet: true });
if (!process.env.SEED_DEMO_PASSWORD) {
  const password = randomBytes(18).toString("hex");
  let settings = readFileSync(".env", "utf8");
  settings = /^SEED_DEMO_PASSWORD=.*$/m.test(settings) ? settings.replace(/^SEED_DEMO_PASSWORD=.*$/m, `SEED_DEMO_PASSWORD=${password}`) : `${settings}\nSEED_DEMO_PASSWORD=${password}\n`;
  writeFileSync(".env", settings, { mode: 0o600 });
  process.env.SEED_DEMO_PASSWORD = password;
  console.log("Demo şifrəsi .env faylında yaradıldı.");
}
if (!process.env.SEED_DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD.length < 12) {
  console.error(".env faylında SEED_DEMO_PASSWORD təyin edin (ən azı 12 simvol)."); process.exit(1);
}
if (process.env.NODE_ENV === "production") { console.error("Demo quraşdırmasını development mühitində işlədin."); process.exit(1); }
const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.error || result.status !== 0) { console.error(`${command} ${args.join(" ")} tamamlanmadı. PostgreSQL bağlantısını və Docker-i yoxlayın.`); process.exit(1); }
};
if (!process.argv.includes("--existing-db")) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 1500 });
  let connected = false;
  try { await pool.query("SELECT 1"); connected = true; } catch { /* Start the default development database if none is reachable. */ }
  finally { await pool.end(); }
  if (connected) console.log("Mövcud PostgreSQL bağlantısı istifadə olunur.");
  else run("docker", ["compose", "up", "-d", "--wait", "postgres"]);
}
run("npm", ["run", "db:generate"]);
run("npm", ["run", "db:migrate"]);
run("npm", ["run", "db:seed"]);
console.log("Hazırdır. npm run demo — nümunələr və AI studiyası brauzerdə açılacaq.");
console.log("Canlı pulsuz AI üçün .env: AI_PROVIDER=huggingface və HF_TOKEN. Ödənişli API tələb olunmur.");
