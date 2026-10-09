# Current AI startup demo verification

Date: 9 October 2026. This report supersedes older UI/editor completion claims for the current startup MVP.

## Passed in this session

- ESLint and TypeScript checks.
- Unit suite: 23/23 tests. Coverage includes spending gates, free-provider source upload and chunked SSE output handling, quota failure without paid fallback, untrusted output URL rejection, valid/invalid furniture bounds, category/style/budget/stock matching, and prepared sample annotations.
- Production webpack build with the new homepage and `/examples`; the removed 2D page and API are absent from the route manifest.
- Real Next.js server rendering in memory without a TCP listener or logged-in database session: homepage and the selected home, office and studio examples return HTTP 200 and render photo interaction controls. Repeat with `npm run build` then `npm run test:public`.
- Four generated bitmap assets were visually inspected: one empty room and three corresponding furnished edits. No claim is made that these are runtime Qwen outputs.
- Git diff whitespace check.

## Implemented, but runtime checks remain

- The official free Qwen Space adapter is implemented against the published Gradio `infer` interface, with server-only authentication, prompt rewriting disabled, timeout, validated same-origin image download and explicit quota/error states. A real remote room edit was **not** run: this environment cannot resolve/connect to the remote host and `HF_TOKEN` is not configured.
- Grounding DINO local detection and durable analysis queue are implemented. The detection model weights have not been downloaded or run in this session. Run the Python preparation steps in README before testing detection on a fresh result.
- The additive furniture-analysis migration is supplied and Prisma client generation passes. Migration execution cannot reach local PostgreSQL (`P1001`; a direct database attempt also returned `EPERM`). Apply migrations and seed from the user's normal Terminal.
- Browser launch is blocked by macOS sandbox Mach-port permissions, and binding the Next development server returns `listen EPERM`. Hover/click/touch visual behavior, cart/order persistence and designer handoff have new Playwright test coverage but these browser tests were not executed here.
- GitHub Actions is supplied to exercise PostgreSQL integration and browser tests without invoking live AI. That workflow has not yet run on GitHub.

## Before presenting live AI

1. Run `npm run demo:setup` against the intended local database.
2. Set `AI_PROVIDER=huggingface` and the free account's `HF_TOKEN` in `.env`; keep both paid flags false.
3. Prepare Grounding DINO, restart app/worker, generate from a real empty-room photo and inspect quality and architecture preservation.
4. Run `npm run test:integration` with the worker stopped, and `npm run test:e2e`.
5. If the free service has no available quota, present the prepared examples as prepared examples. Never claim an unavailable generation succeeded.

No external deployment or GitHub push was performed. `.env`, credentials, model weights, personal uploads and local database state remain excluded from git.
