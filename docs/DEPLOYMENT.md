# Deployment checklist

The application has not been deployed and no paid service has been connected. This document describes the supplied deployment path.

1. Provision PostgreSQL and private S3-compatible storage. Back up both and test restoration. Use distinct application credentials and private bucket policies.
2. Configure the server environment from `.env.example`. Use an HTTPS `APP_URL`. Do not expose database, storage, SMTP or OpenAI keys using `NEXT_PUBLIC_*` variables. Remove `SEED_DEMO_PASSWORD` from production.
3. Run `npm ci`, `npm run db:generate`, `npm run db:migrate`, and `npm run build` in your release pipeline. Migrations do not execute automatically when starting the web process.
4. Run `npm start` behind a TLS reverse proxy. The provided Dockerfile uses Node 24 and explicitly binds Next.js to `0.0.0.0`; non-container `npm start` binds loopback by default.
5. Run `npm run worker` as a separate supervised process with shared database/S3 environment. The web app alone saves projects and enqueues jobs, but cannot process them without a worker.
6. Enable SMTP and email verification only after testing delivery. Configure a supported OpenAI image editing model and monitor usage before enabling paid generation. Platform cost estimates are configurable estimates, not provider invoices.
7. Create the first admin through your trusted database administration process; public registration excludes ADMIN. Do not seed demo data into production. Admin manual billing confirmation requires externally verified receipt; no payment gateway is installed.
8. Run smoke tests using separate test accounts, monitor structured API/job errors and PostgreSQL health, and configure retention, incident response and user support workflows.

`compose.yaml` provisions local PostgreSQL and MinIO only. Its default credentials and loopback ports are development settings. Docker/MinIO container execution remains unverified when Docker is unavailable in the current workstation; this must be checked on the deployment host. A single stage copy of runtime dependencies is used for maintainability; optimize to standalone output separately if required.

Service integrations still needing credentials: OpenAI, production S3 and SMTP. Live payment processing, OAuth, multilingual translation, infrastructure observability and automated retention policies are outside the delivered version. Review local policy/terms text for the actual operator before commercial launch.
