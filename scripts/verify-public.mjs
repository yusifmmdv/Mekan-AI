import next from "next";
import { IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";
import assert from "node:assert/strict";
// Render real Next routes in memory: no TCP listener, browser or database session.
const app = next({ dev: false, quiet: true, hostname: "127.0.0.1", port: 3000 });
async function render(url) {
  const chunks = [];
  const socket = new Duplex({ read() {}, write(chunk, encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
  socket.remoteAddress = "127.0.0.1";
  const request = new IncomingMessage(socket);
  request.method = "GET"; request.url = url; request.headers = { host: "127.0.0.1:3000" }; request.push(null);
  const response = new ServerResponse(request); response.assignSocket(socket);
  const finished = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Render timed out: ${url}`)), 20_000);
    response.on("finish", () => { clearTimeout(timer); resolve(); });
    response.on("error", error => { clearTimeout(timer); reject(error); });
  });
  await app.getRequestHandler()(request, response); await finished;
  return { status: response.statusCode, html: Buffer.concat(chunks).toString() };
}
try {
  await app.prepare();
  for (const [url, expected] of [
    ["/", "Boş otaqdan"],
    ["/examples?space=home", "İsti Skandinaviya evi"],
    ["/examples?space=office", "Fokus üçün modern ofis"],
    ["/examples?space=studio", "Yaradıcı dizayn studiyası"],
  ]) {
    const result = await render(url);
    assert.equal(result.status, 200, `${url}: HTTP 200`);
    assert.ok(result.html.includes(expected), `${url}: correct selected content`);
    assert.ok(result.html.includes("furniture-hotspot"), `${url}: on-photo furniture controls`);
    assert.ok(!result.html.includes('href="/room-editor"'), `${url}: no removed editor navigation`);
    console.log(`PASS ${url}`);
  }
} finally { await app.close(); }
