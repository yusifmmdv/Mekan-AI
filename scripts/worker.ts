import "dotenv/config";
import { processNext } from "../lib/generations";
import { processNextAnalysis } from "../lib/furniture-analysis";
import { db } from "../lib/db";
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
async function main() {
  console.info(JSON.stringify({ event: "worker_started" }));
  while (!stopping) {
    try {
      const worked = await processNext();
      const analyzed = await processNextAnalysis();
      if (!worked && !analyzed) await new Promise((r) => setTimeout(r, 2000));
    } catch (e) {
      console.error(
        JSON.stringify({
          event: "worker_error",
          message: e instanceof Error ? e.message : "UNKNOWN",
        }),
      );
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  await db.$disconnect();
}
main().catch(() => process.exit(1));
