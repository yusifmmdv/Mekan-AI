# Mekan AI

Azerbaijani furniture marketplace and room design application built with Next.js App Router, strict TypeScript, PostgreSQL/Prisma, private image storage and local Stable Diffusion image editing and an optional, explicitly enabled OpenAI provider. The brand is configurable with `NEXT_PUBLIC_BRAND_NAME`. Catalog fixtures and prices are labeled demo/sample; no payments, AI outputs, partnerships or analytics are simulated.

## Local setup

Requires Node.js 24+, npm and Docker Compose (or an existing PostgreSQL server).

```sh
npm ci
cp .env.example .env
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Before seeding, set `SEED_DEMO_PASSWORD` to your own password of at least 12 characters. Seed refuses production environments. Demo accounts are `customer@demo.mekan.test`, `realtor@demo.mekan.test`, `store_owner@demo.mekan.test`, `designer@demo.mekan.test`, and `admin@demo.mekan.test`. New registrations start with **zero** credits. An admin can approve businesses/products, adjust credits and confirm manual payment records. Demo seed is repeatable but does not overwrite existing accounts.

Use the exact origin in `APP_URL` when opening the browser; write requests enforce origin checks. Default example: http://localhost:3000. Run the application and the generation worker as separate processes:

```sh
npm run worker
```

Local AI installation downloads public model weights once; generation runs on your own hardware. Room photos use private local disk by default. To use MinIO, change `STORAGE_DRIVER=s3`; Compose provisions a private bucket. The application streams authorized images through `/api/images/:id`. S3 credentials remain server-side. Product, logo and portfolio images attached to approved public records are public through that controlled route; room images stay private.

## Configuration

See [.env.example](.env.example) for all environment variable names.

| Variables                                                           | Purpose                                                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                                                      | PostgreSQL connection for app, migrations and worker                          |
| `APP_URL`                                                           | Canonical browser origin and email link base                                  |
| `NEXT_PUBLIC_BRAND_NAME`                                            | Public brand text                                                             |
| `STORAGE_DRIVER`, `STORAGE_PATH`                                    | `local` private disk directory or `s3`                                        |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`                             | S3-compatible endpoint and private bucket                                     |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`                          | Server-only storage credentials                                               |
| `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`               | Use `openai` and a configured image editing model; server-only key            |
| `AI_COST_ESTIMATE_AZN`                                              | Optional administrator estimate per generation; not verified provider billing |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Transactional email transport                                                 |
| `REQUIRE_EMAIL_VERIFICATION`                                        | Require configured mail and verified emails when `true`                       |
| `SEED_DEMO_PASSWORD`                                                | Local demo account password; never ship to production                         |

The default local AI provider requires no paid API key and consumes zero platform credits. See [local AI setup](docs/LOCAL_AI.md). OpenAI is blocked unless `ALLOW_PAID_AI=true` is explicitly configured, with a valid key. Without a running/configured model service, generation fails honestly. Without SMTP, reset requests return an explicit configuration error. Email verification can be required when SMTP is available. There is no payment gateway: billing creates pending requests and admin records an externally verified manual payment reference. Do not confirm payment records without confirming receipt externally.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run build
```

Unit tests validate permissions, password hashing, uploads, schemas and recommendation constraints. Integration tests require the migrated database in `.env`, create unique isolated fixtures and delete only those fixtures. They test real credit concurrency, idempotency, generation failure/refund and order ownership/stock transactions. Stop the worker before integration tests; the mocked worker test refuses unrelated queued jobs. Tests never call a paid provider.

Playwright exercises registration/login, catalog/cart, admin/store permissions, origin checks and private uploads/project access using a running local app. It also verifies isolated TEST manual billing confirmation/replay and audit logs, realtor staging ownership, and designer service requests/completion. Test billing references explicitly say TEST_NO_REAL_PAYMENT; no real payment is represented. It creates and removes a unique test customer. E2E assumes default local disk and email verification disabled. Run against a development/test environment only.

## Production deployment

No deployment is performed by this repository setup. Provision PostgreSQL, a private S3 bucket and optional SMTP/OpenAI credentials yourself. Use separate least-privilege credentials and TLS, set the canonical HTTPS `APP_URL`, and apply migrations with `npm run db:migrate`. Build with `npm run build`; start with `npm start` behind a reverse proxy. A supplied Dockerfile binds to all container interfaces. Run `npm run worker` as a supervised separate service using the same environment and storage. Avoid multiple processes on non-shared local disk: use S3 in production. Back up PostgreSQL and object storage, monitor worker failures and review logs. Never run demo seed in production. Docker Compose defaults are local development credentials and loopback ports.

Use the lockfile with `npm ci`. The Docker build has not necessarily been executed; the QA report distinguishes verified commands from supplied deployment assets.

## Scope and limitations

The application implements role dashboards, moderated catalog, favorites, comparison, cart/order requests, inquiries, design projects, realtor properties/staging, designer services/requests, configurable sample plans, credit ledger/manual billing, administrative controls and recorded events. Detailed implementation status is in [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) and architecture in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Virtual staging disclosures are also baked into downloaded result images. Room edits attempt to preserve architecture but cannot guarantee exact geometry. Catalog recommendations are deterministic visually/style-similar suggestions; they do not prove that generated furniture is a catalog item. Exact 3D placement is unavailable. Price/dimension filters do not solve a complete room layout or guarantee fit. Actual provider costs are not calculated from usage. Online checkout, OAuth, live chat, multilingual translations, automated marketplace payouts and production operations remain future work. Azerbaijani is implemented; locale fields and centralized labels support later English/Russian work.

## Provider reference

The configurable image-edit adapter follows the [official OpenAI image-edit API](https://developers.openai.com/api/reference/resources/images/methods/edit). Paid API model access and live OpenAI generation remain untested without credentials. Local model verification is recorded separately in `docs/LOCAL_AI.md`.

## Interactive 2D room editor

Open `/room-editor` after login. Upload a room photograph, add furniture from the marketplace or the original CC0 demo asset catalog, and save your design. Existing AI projects also link to the editor. This uses Konva and private PostgreSQL documents; no AI generation, API key or payment is required. See [docs/ROOM_EDITOR.md](docs/ROOM_EDITOR.md).

## Whole-space redesign to implementation

The studio accepts one primary room view and up to five supporting photos for homes, offices and studios. Wall, flooring, lighting and custom furniture requirements form a saved brief. Project-linked requests deliver this brief to approved stores and available designer services through existing dashboards. Only explicitly selected recipients gain access to the project images. Local AI currently renders the primary view; supporting photos are context rather than multi-view reconstruction. See [docs/REDESIGN.md](docs/REDESIGN.md).
