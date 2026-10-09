import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const repo = "yusifmmdv/Mekan-AI";
function run(command, args, capture = false) {
  const r = spawnSync(command, args, { encoding: "utf8", stdio: capture ? "pipe" : "inherit" });
  if (r.error || r.status !== 0) throw new Error(`${command} failed. ${capture ? r.stderr || "" : "See output above."}`);
  return r.stdout?.trim();
}
try {
  if (run("git", ["status", "--porcelain"], true)) throw new Error("Commit changes before deploying.");
  if (run("git", ["branch", "--show-current"], true) !== "main") throw new Error("Run from main.");
  if (!/^https:\/\/github\.com\/yusifmmdv\/Mekan-AI(?:\.git)?$/.test(run("git", ["remote", "get-url", "origin"], true))) throw new Error("Unexpected origin.");
  run("gh", ["auth", "status"]);
  run("git", ["push", "-u", "origin", "main"]);
  const pages = spawnSync("gh", ["api", `repos/${repo}/pages`], { encoding: "utf8" });
  if (pages.status === 0) {
    if (JSON.parse(pages.stdout).build_type !== "workflow") run("gh", ["api", `repos/${repo}/pages`, "--method", "PUT", "-f", "build_type=workflow"]);
  } else if (pages.stderr?.includes("404")) run("gh", ["api", `repos/${repo}/pages`, "--method", "POST", "-f", "build_type=workflow"]);
  else throw new Error(pages.stderr || "Cannot configure Pages.");
  const head = run("git", ["rev-parse", "HEAD"], true);
  run("gh", ["workflow", "run", "deploy-review.yml", "--repo", repo, "--ref", "main"]);
  let id;
  for (let n = 0; n < 12 && !id; n++) {
    const rows = JSON.parse(run("gh", ["run", "list", "--repo", repo, "--workflow", "deploy-review.yml", "--event", "workflow_dispatch", "--commit", head, "--json", "databaseId", "--limit", "1"], true));
    id = rows[0]?.databaseId;
    if (!id) await new Promise(resolve => setTimeout(resolve, 2500));
  }
  if (!id) throw new Error("Workflow started; check repository Actions.");
  run("gh", ["run", "watch", String(id), "--repo", repo, "--exit-status", "--interval", "3"]);
  const { html_url: url } = JSON.parse(run("gh", ["api", `repos/${repo}/pages`], true));
  if (!url?.startsWith("https://")) throw new Error("No HTTPS URL returned.");
  const file = "README.md", text = readFileSync(file, "utf8");
  writeFileSync(file, text.replace(/<!-- review-url:start -->[\s\S]*?<!-- review-url:end -->/, `<!-- review-url:start -->\n**[İnteraktiv demoya baxın →](${url})** · Giriş tələb olunmur. Hazır AI nümunələri və şəkildə mebel hover təqdimatı.\n<!-- review-url:end -->`));
  run("git", ["add", "README.md"]);
  if (spawnSync("git", ["diff", "--cached", "--quiet", "--", "README.md"]).status === 1) {
    run("git", ["commit", "-m", "Add verified public demo URL"]); run("git", ["push", "origin", "main"]);
  }
  console.log(`\nLIVE DEMO: ${url}\n`);
} catch (e) { console.error(e.message); process.exitCode = 1; }
