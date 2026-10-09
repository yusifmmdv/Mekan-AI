# Deploy

## Free interactive presentation

The static review reuses the product homepage and shoppable-room React component. It includes home/office/studio samples, before/after controls and on-photo furniture price/seller hover. Images and prices are labeled as prepared demo data. It does not call live AI or submit orders.

```sh
npm run deploy:review
```

Requires GitHub CLI authentication and committed changes. The script pushes `main`, configures Pages, starts the deployment workflow, waits for success, and updates README with the returned URL. It never force-pushes or changes repository visibility.

Manual alternative: push the repository; select **Settings → Pages → Source → GitHub Actions**; run **Actions → Deploy public review**. The successful `github-pages` environment contains the actual URL. Expected default address: `https://yusifmmdv.github.io/Mekan-AI/` — deployment must succeed before sharing it.

```sh
npm run build:review
# Repository subpath:
REVIEW_BASE_PATH=/Mekan-AI/ npm run build:review
```

Upload `review-dist/` to a static host. It contains HTML, CSS, JS and public sample assets; no secrets or private uploads. [Official Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Full application

Use a Docker-capable Node.js web service, a separate worker, PostgreSQL and shared private S3-compatible storage. Set `APP_URL` to the actual HTTPS origin. Share database and storage settings between web and worker. Set `HF_TOKEN` as a server secret and keep both paid-AI flags false. The worker also needs Python and prepared Grounding DINO weights. Apply migrations, then seed the private demo database with your own demo password. Ephemeral web-host filesystems cannot preserve uploaded images.

The repository Dockerfile serves the web app on `0.0.0.0` and respects `PORT`. Python detector dependencies need a separate compatible worker image/environment. Full backend hosting has not been deployed or verified here. [Render service types](https://render.com/docs/service-types) and [free-plan limits](https://render.com/docs/free).

## Current status

The public interactive presentation is deployed at **https://yusifmmdv.github.io/Mekan-AI/**. GitHub Pages build and deployment succeeded; the live page returned HTTP 200 and browser checks confirmed hydration, on-photo product cards and office sample switching. README and the repository Website field point to the deployed page.

The full application backend is not deployed. The public presentation does not invoke live AI or submit orders. An earlier Sites registration was not published; its identity remains in `/Users/yusif/mekan-ai-public/.openai/hosting.json` if that path is resumed.
