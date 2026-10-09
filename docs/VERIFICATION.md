# Verification report — 9 October 2026

Executed locally against isolated PostgreSQL database `mekan_ai_dev` with the application on loopback port 3000. No paid calls and no deployment.

| Check                                       | Actual result                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Prisma schema validation                    | Passed                                                                                                          |
| Initial SQL migration / migrate deploy      | Applied successfully                                                                                            |
| Repeatable development seed                 | Passed                                                                                                          |
| ESLint                                      | Passed, no warnings after private-image optimization exceptions                                                 |
| Strict TypeScript                           | Passed                                                                                                          |
| Vitest unit tests                           | 10 passed                                                                                                       |
| PostgreSQL integration tests                | 7 passed                                                                                                        |
| Playwright Chromium workflows               | 5 passed                                                                                                        |
| Next.js production build                    | Passed                                                                                                          |
| Build with unreachable placeholder database | Passed; sitemap generated at request time                                                                       |
| Production dependency audit                 | Zero reported vulnerabilities                                                                                   |
| Full dependency audit                       | Five high findings in development ESLint chain; upstream patched braces version unavailable in current registry |
| Desktop 1440px / mobile 390px visual review | No horizontal overflow, loaded images, no browser errors                                                        |
| Docker and MinIO execution                  | Not run: Docker unavailable                                                                                     |
| OpenAI live image edit                      | Not run: no API key configured                                                                                  |
| SMTP live reset / verification delivery     | Not run: no SMTP credentials configured                                                                         |

Tests use unique temporary records and scoped cleanup. The generation failure test injects a failing provider; it does not invent a successful live AI result. Manual billing E2E uses an isolated TEST record with explicit test reference, then removes the record. No real payment is claimed.

## Covered workflows

Customer registration/login; bcrypt credential rejection; forbidden admin registration; server role restrictions; same-origin defense; private asset and project access; logout session invalidation; store product creation/editing and moderation; forbidden foreign product edits; cart and order request business logic; order stock rollback and completion ownership; concurrent credit deduction, insufficient credits, duplicate reservations, refund idempotency; corrupted uploads/MIME/size limits; staging disclosure; deterministic recommendation budget/stock/dimension filters; realtor property/private staging linkage; designer service/request completion with exactly one commission; manual admin billing with exactly one ledger grant/subscription/audit entry.

## Launch work still required

Configure and verify external AI, SMTP and production S3; verify supplied Docker setup; establish operator/legal policies and infrastructure backups/monitoring. No live checkout provider is installed. OAuth, exact 3D catalog placement, semantic recommendations, full English/Russian translations, automatic payouts, provider invoice reconciliation and automated retention are future work. Business lists cap their displayed records; public catalog pagination is implemented. Uploaded product/property images can be added sequentially up to ten images per form.

## Free local AI change

Default provider switched to authenticated loopback Stable Diffusion. Paid OpenAI calls fail closed unless explicitly enabled. Local jobs reserve zero credits and record zero paid API cost. Additional verification: 14 unit tests and 8 PostgreSQL integration tests passed (provider routing/refusal and zero-credit generation). Five browser workflows, lint, TypeScript and production build passed after this change. Local Python dependencies installed in isolated `.local-ai/venv`; model download and actual inference result are recorded in `LOCAL_AI.md` when verified. No OpenAI calls performed.

Actual local inference verified: downloaded SD1.5 (~2.6 GB), Apple M2/MPS runtime, end-to-end saved demo room generation succeeded, zero reserved credits / zero paid API cost, result stored privately and displayed in comparison. Initial compatibility failure recorded truthfully and fixed. See `LOCAL_AI.md`.

## Interactive room editor — 2026-10-09

Lint and TypeScript checks passed. Production build passed with `/room-editor` and authenticated `/api/room-editor`. Unit suite23/23 and PostgreSQL integration suite14/14 passed. Focused Playwright editor workflow passed pointer hover/selection/dragging, numeric resize/rotation, undo/redo, deletion, save/reload, real linked-product cart insertion, version conflict rejection and foreign ownership rejection. Mobile390px touch selection and layout were checked. No generation or OpenAI requests were issued during the editor workflow. Original CC0 assets decoded7/7 with transparent corners. Demo-room visual screenshots: `public/preview-room-editor.png` and `public/preview-room-editor-mobile.png`. Both paid-provider flags remain false. No deployment performed.

Full Playwright regression suite:6/6 passed, including existing admin/realtor/designer/customer/store workflows and the new editor workflow.

## Whole-space redesign and implementation handoff

2026-10-09: schema migration applied for space type, additional private photos, project-linked store inquiries and designer requests. Lint/typecheck and production build passed;23 unit and14 integration tests passed. Browser regression initially passed5/7; a cold login wait and a streamed-not-found status assertion were corrected, then the remaining2 scenarios passed. New workflow verifies gallery persistence, foreign-gallery rejection, quote delivery to store/designer, shared brief access and image authorization only after explicit recipient selection. No paid APIs or automatic payments enabled. See `REDESIGN.md` for local-model and provider-directory limitations.
