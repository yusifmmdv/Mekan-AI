import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const out = path.join(root, "review-dist");
const base = process.env.REVIEW_BASE_PATH || "/";
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error("REVIEW_BASE_PATH must be / or a path such as /Mekan-AI/.");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const links = path.join(root, "review/links.tsx");
const common = {
  bundle: true, jsx: "automatic", tsconfig: path.join(root, "tsconfig.json"),
  define: { "process.env": JSON.stringify({ NODE_ENV: "production", REVIEW_BASE_PATH: base }) },
  plugins: [{ name: "static-review-links", setup(builder) {
    builder.onResolve({ filter: /^@\/components\/shoppable-room$/ }, () => ({ path: path.join(root, "review/room.tsx") }));
    builder.onResolve({ filter: /^next\/(link|image|navigation)$/ }, args => ({ path: links, namespace: args.path === "next/image" ? "review-image" : "file" }));
    builder.onLoad({ filter: /.*/, namespace: "review-image" }, () => ({ contents: `export { ReviewImage as default } from ${JSON.stringify(links)};`, loader: "tsx", resolveDir: root }));
  } }],
};
await build({ ...common, entryPoints: ["review/client.tsx"], platform: "browser", format: "esm", outfile: path.join(out, "app.js"), minify: true });
// Render the actual shared React product UI into static HTML for crawlers and
// no-JS visitors. The same component hydrates all hover and sample controls.
const serverFile = path.join(root, "review/.render.mjs");
try {
  await build({ ...common, entryPoints: ["review/app.tsx"], platform: "node", format: "esm", outfile: serverFile, packages: "external" });
  const { ReviewApp } = await import(pathToFileURL(serverFile).href);
  const body = renderToString(createElement(ReviewApp));
  const html = `<!doctype html><html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Mekan AI — ev, ofis və studiya üçün AI interyer dizaynı və şəkildə mebel kəşfi. İnteraktiv təqdimat."><title>Mekan AI — Boş otaqdan sizin məkanınıza</title><link rel="icon" href="${base}icon.svg"><link rel="stylesheet" href="${base}app.css"></head><body><div id="review-root">${body}</div><script type="module" src="${base}app.js"></script></body></html>`;
  await writeFile(path.join(out, "index.html"), html);
} finally { await rm(serverFile, { force: true }); }
const css = await postcss([tailwind({ base: root })]).process(await readFile(path.join(root, "app/globals.css"), "utf8"), { from: path.join(root, "app/globals.css"), to: path.join(out, "app.css") });
await writeFile(path.join(out, "app.css"), `${css.css}\n.review-banner{margin:0 0 1rem;color:var(--muted);font-size:.85rem}#examples,#demo-notes{scroll-margin-top:2rem}\n`);
for (const folder of ["demo", "editor-assets"]) await cp(path.join(root, "public", folder), path.join(out, folder), { recursive: true });
await cp(path.join(root, "app/icon.svg"), path.join(out, "icon.svg"));
await writeFile(path.join(out, ".nojekyll"), "");
console.log(`Public review built: ${out} (base ${base}). No backend, tokens or credentials included.`);
