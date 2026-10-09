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
- The furniture-analysis migration and Prisma client generation now pass against the local development database after execution permissions became available. The local server was restarted to replace its stale Prisma instance.
- The initial sandbox blocked browser launch. After network and execution permissions became available, the public-example Playwright test passed on the actual local app: on-photo hover bounds, keyboard focus/Escape, sample switching, before view and mobile touch. The full prepared-example Playwright flow also passed: private project import, hover-to-cart, persisted order request, designer handoff and outsider access denial. These tests make no paid AI calls.
- GitHub Actions runs PostgreSQL integration and browser tests without live AI. An initial browser run exposed a hover-card dismissal defect and test cleanup dependency issue; these were corrected and both prepared-example browser tests passed locally. The latest remote CI result is available in repository Actions.

## Before presenting live AI

1. Run `npm run demo:setup` against the intended local database.
2. Set `AI_PROVIDER=huggingface` and the free account's `HF_TOKEN` in `.env`; keep both paid flags false.
3. Prepare Grounding DINO, restart app/worker, generate from a real empty-room photo and inspect quality and architecture preservation.
4. Run `npm run test:integration` with the worker stopped, and `npm run test:e2e`.
5. If the free service has no available quota, present the prepared examples as prepared examples. Never claim an unavailable generation succeeded.

The public review build is deployed at https://yusifmmdv.github.io/Mekan-AI/. GitHub push and Pages deployment succeeded after execution/network permissions changed. The live page returned HTTP 200; browser checks found no JavaScript errors and confirmed on-photo price/seller cards and office sample switching. The repository Website field and README contain the deployed link. An earlier Sites registration was not published. `.env`, credentials, model weights, personal uploads and local database state remain excluded from git.
