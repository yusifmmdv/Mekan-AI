# Local room image generation

Local Stable Diffusion img2img runs on this computer through a private loopback service. It does not call OpenAI or a paid image API. The first model download uses internet bandwidth and approximately 2–3 GB of disk; inference consumes your computer's memory and electricity. CPU generation can take minutes. Apple Silicon uses MPS when available.

## Start

The local Python environment is installed separately from npm dependencies. On this Mac it is already installed. For a fresh checkout:

```sh
python3 -m venv .local-ai/venv
.local-ai/venv/bin/python -m pip install -r local_ai/requirements.txt
npm run ai:prepare
```

Then start the service from the project directory:

```sh
.local-ai/venv/bin/python local_ai/server.py
```

Download the public model files before the first inference (the service never auto-downloads while processing private input):

```sh
.local-ai/venv/bin/python local_ai/prepare.py
```

Run Next.js and the queue worker in separate terminals:

```sh
npm run dev
npm run worker
```

Configure the same server-only environment for the app, worker and local service:

```dotenv
AI_PROVIDER=local
LOCAL_AI_URL=http://127.0.0.1:7861
LOCAL_AI_TOKEN=your-random-local-secret
LOCAL_AI_MODEL=stable-diffusion-v1-5/stable-diffusion-v1-5
ALLOW_PAID_AI=false
PAID_AI_ENABLED=false
OPENAI_API_KEY=
```

Create a random token and keep it in `.env`; never include it in browser code or commit it. `LOCAL_AI_URL` must point to loopback. The adapter calls the local service's authenticated `/edit` endpoint. With `PAID_AI_ENABLED=false` or `ALLOW_PAID_AI=false`, setting an OpenAI key does not enable paid calls. Choose the local provider explicitly; unknown providers fail rather than silently falling back.

## Behavior and limitations

Local generations consume zero platform credits. Queue concurrency limits still apply. Jobs save private source/output images and record provider/model metadata. Unavailable service or invalid output becomes a real failed job; the platform does not substitute an image or invent success.

Img2img conditions on the source room photo and prompt, but it is not a CAD tool or validated architectural renderer. It may change doors, windows, geometry or furniture. Furniture is illustrative; catalog matches are suggestions. The default model is general purpose and may need tuning for useful interior results. An actual sample generation must be inspected before claiming quality or architecture preservation.

Tests mock the local HTTP response and verify routing, errors and zero-credit accounting without downloading a model or contacting a paid provider. Check the final implementation report for actual local inference/download results.

Model source/license: [Stable Diffusion v1.5 model card](https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5), CreativeML OpenRAIL-M. Apple Silicon setup follows the [Diffusers MPS documentation](https://huggingface.co/docs/diffusers/optimization/mps).

## Verified on this workstation

On 9 October 2026: installed the pinned Python dependencies, downloaded the public SD1.5 fp16 model files (~2.6 GB), confirmed Apple M2 MPS acceleration, and generated a real room edit through the complete application upload → saved project → durable worker → local model → stored output workflow. The job succeeded with zero credits reserved and zero paid API cost. A real demo project is available under the customer demo account; `public/preview-local-ai.png` captures its comparison UI. Initial model-loading failures were recorded as failures and charged nothing; compatibility was fixed by enabling slicing on `pipeline.vae` for Diffusers 0.41. No hosted inference or OpenAI request was made.

The model and service remain local to this computer. Keep both `npm run ai:local` and `npm run worker` running while generating. The rendered sample is low resolution (512px on its longest side), illustrative, and cannot guarantee furniture fidelity or exact room geometry.
