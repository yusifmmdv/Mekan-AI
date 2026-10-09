# Mekan AI implementation checklist

## Architecture and decisions

- [x] Inspect workspace: no Mekan repository; unrelated repositories preserved.
- [x] Isolated Next.js 16.4 / React 19.3 app; strict TypeScript.
- [x] Choose Prisma 7.10 stable rather than registry's Prisma 8 RC.
- [x] PostgreSQL durable state; no fake fallback database.
- [x] Opaque, hashed, database-backed sessions; bcrypt passwords; server role checks.
- [x] Local private storage for development, S3 abstraction for production.
- [x] Durable PostgreSQL generation queue with atomic credit reservation and refund.
- [x] Order requests only; no simulated payment success.
- [x] Azerbaijani UI with locale dictionary seam, configurable branding.

## Phases

- [x] 2 Foundation: schema, migrations, auth, layouts, design system.
- [x] 3 Marketplace: catalog, filters, favorites, comparison, cart, inquiries, order requests.
- [x] 4 AI: upload, image edit provider, queue, history, recommendations.
- [x] 5 Realtor: properties, staging, private results, credits.
- [x] 6 Dashboards: stores, designers, admin, tracked analytics.
- [x] 7 Monetization: editable sample plans, ledger, manual billing, commissions.
- [x] 8 QA: unit/integration/E2E, lint, types, production build, docs.

## Honest limits

No external paid calls or deployment authorized. Local AI has been verified with a real saved generation and zero credit deduction. SMTP verification still needs credentials. Payment checkout is not enabled. Exact 3D placement and exact catalog product rendering are future capabilities. Legal text requires local legal review before commercial launch. Demo records are explicitly marked.

## Phase completion records

| Phase                 | Delivered and important files                                                                                                                                          | Verification and unfinished work                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1 Architecture        | `docs/IMPLEMENTATION.md`, `docs/DESIGN.md`, `package.json`, `tsconfig.json`                                                                                            | Workspace inspection and registry versions checked; new isolated project selected.                                                  |
| 2 Foundation          | `prisma/schema.prisma`, `prisma/migrations/20261009120000_initial/migration.sql`, `lib/auth.ts`, `lib/security.ts`, `lib/mail.ts`, `app/layout.tsx`, `app/globals.css` | Schema valid, migration applied, bcrypt and registration tests pass. Real email delivery needs SMTP.                                |
| 3 Marketplace         | `lib/marketplace.ts`, `app/marketplace/`, `app/cart/page.tsx`, `app/compare/page.tsx`, `components/catalog.tsx`, API routes                                            | Ownership, stock transactions and browser catalog/cart/product workflows pass. Orders are requests; online payment unavailable.     |
| 4 AI studio           | `lib/ai.ts`, `lib/generations.ts`, `lib/storage.ts`, `lib/recommendations.ts`, `scripts/worker.ts`, `app/studio/`, `app/dashboard/projects/`                           | Private uploads, credit races, failure/refund tests pass. Local provider verified with a real generation; paid provider remains disabled.                              |
| 5 Realtor             | Property/staging schema and mutation routes, realtor dashboard, `lib/staging.ts`                                                                                       | Realtor private project workflow passes; image disclosure unit test passes. Live staging awaits AI configuration.                   |
| 6 Business dashboards | `components/business-dashboard.tsx`, `components/analytics-chart.tsx`, `lib/i18n.ts`, dashboard routes                                                                 | Store/designer/admin permission and positive workflow tests pass. Displayed business lists capped; full multilingual copy deferred. |
| 7 Monetization        | `lib/credits.ts`, billing/admin mutation handlers, plans/credits dashboards                                                                                            | Atomic credit tests and admin TEST payment replay pass. No gateway, no automatic payouts or provider invoice reconciliation.        |
| 8 QA                  | `tests/`, Vitest/Playwright configs, `README.md`, `compose.yaml`, `Dockerfile`, deployment/architecture/verification docs                                              | Lint, types, 10 unit, 7 integration, 5 browser tests and production build pass. Docker and external integrations unverified.        |

Complete verification and explicit remaining scope: [VERIFICATION.md](VERIFICATION.md).
