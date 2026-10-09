# Architecture

Next.js server pages query PostgreSQL through Prisma's `pg` adapter; interactive React forms call validated API routes. `lib/` contains authentication, authorization, storage, marketplace, credit and generation business logic. `app/api/[...path]/route.ts` is the mutation boundary, enforcing same-origin writes, PostgreSQL-backed rate limits, Zod validation and server-side role/ownership checks. Public pages only query approved businesses and active products.

## Data and trust boundaries

Passwords use bcrypt cost 12. Browser session tokens are random, stored as SHA-256 hashes in PostgreSQL and sent as HttpOnly, SameSite cookies (Secure in production). Reset tokens expire and revoke existing sessions. Room assets and generations are authorized by owner; uploaded images are decoded with Sharp, size/dimension/MIME checked, stripped/re-encoded to WebP and assigned unpredictable keys. Storage credentials and AI keys never enter client bundles.

Users own projects, properties, stores or designer profiles. Products belong to stores and categories; cart items and order snapshots reference products. Order requests split per store and snapshot unit price. Completing an order deducts stock transactionally and emits recorded-sale events. These records represent platform-recorded fulfillment, not payment gateway receipts or market-wide revenue.

## Generation jobs and accounting

Enqueue locks the user's wallet, verifies ownership, limits active jobs, reserves one credit and writes an idempotent job within one transaction. The worker claims jobs with `FOR UPDATE SKIP LOCKED`, reads the private input, invokes a configurable `ImageProvider`, stores a normalized private output and marks the job succeeded. Retryable failures have bounded backoff. Terminal failures atomically transition and refund once. Abandoned processing jobs expire after ten minutes and refund rather than blindly repeat an ambiguous paid call. Idempotency keys prevent duplicate financial mutations. PostgreSQL conditional wallet updates prevent a negative balance.

Provider request metadata is retained; configured AZN estimates are explicitly estimates. Provider-reported actual AZN billing is not integrated. Payment requests remain pending until admin manual confirmation; a locked transaction grants credits and creates a subscription once, with an audit log. This is not a live payment integration. Designer commission defaults to zero and can be configured by admin.

## Operations

Run the web app and worker separately with shared PostgreSQL and S3. Migrations are versioned in `prisma/migrations`. Local Compose offers PostgreSQL and private MinIO. Database-backed rate buckets work across app instances. Monitor structured API/job logs without logging keys, image content or passwords. Retention cleanup, distributed tracing, webhook-driven payments, delivery guarantees for email, sophisticated fraud controls and backup/restore automation require production operational work.

## Dependency audit

Executed `npm audit --omit=dev`: zero reported vulnerabilities at implementation time. Full `npm audit` reports five high findings in the development ESLint dependency chain (`braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, `eslint-config-next`). The compatible scoped overrides reduce other findings; those remaining require upstream fixes/compatible upgrades. They are not production runtime dependencies. Re-run audits before deployment because advisories change.

## Free local inference

The default provider is a token-protected loopback Stable Diffusion image-to-image service. Model weights are downloaded during explicit setup; inference uses locally cached weights. Local jobs consume zero credits and record zero provider cost. Paid OpenAI calls require both explicit `PAID_AI_ENABLED=true` and `ALLOW_PAID_AI=true` settings as well as a server-side key. See [LOCAL_AI.md](LOCAL_AI.md) for setup and quality limits.

## Interactive 2D furniture editing

`RoomDesign` stores an owner-authorized background asset, a validated JSON scene and an optimistic version. Canvas coordinates are fixed1000×750 and responsive rendering scales the stage. Width/height persist the normalized object scale relative to240×180 assets. Konva holds editable transparent overlays separately from the locked photo; history is immutable and bounded to50 undo snapshots. Saved scenes restore product IDs; product information is resolved against approved, active marketplace records. Cart actions reuse existing stock and authorization checks. The editor has no inference or billing dependency.
