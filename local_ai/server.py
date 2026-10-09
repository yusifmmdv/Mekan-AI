"""Private loopback image-to-image inference. No hosted inference APIs or billing."""
import os
os.environ.setdefault('PYTORCH_ENABLE_MPS_FALLBACK', '1')
os.environ.setdefault('HF_HUB_DISABLE_TELEMETRY', '1')
from pathlib import Path
import base64
import io
import secrets
import threading
import json
from dotenv import load_dotenv
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / '.env')
os.environ.setdefault('HF_HOME', str(ROOT / '.local-ai' / 'models'))
from fastapi import FastAPI, File, Form, UploadFile, Header, HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
import uvicorn

app = FastAPI(title='Mekan local image service', docs_url=None, redoc_url=None)
MODEL = os.getenv('LOCAL_AI_MODEL', 'stable-diffusion-v1-5/stable-diffusion-v1-5')
TOKEN = os.getenv('LOCAL_AI_TOKEN', '')
MAX_BYTES = 10 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 40_000_000
lock = threading.Lock()
pipeline = None
state = {'status': 'not_loaded', 'device': None, 'error': None}

def authorize(token):
    if not TOKEN or not token or not secrets.compare_digest(token, TOKEN):
        raise HTTPException(401, 'Local service authentication failed')

def load_pipeline():
    global pipeline
    if pipeline is not None:
        return pipeline
    state.update(status='loading', error=None)
    import torch
    from diffusers import StableDiffusionImg2ImgPipeline, DPMSolverMultistepScheduler
    torch.set_num_threads(2)
    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    dtype = torch.float16 if device == 'mps' else torch.float32
    loaded = StableDiffusionImg2ImgPipeline.from_pretrained(
        MODEL, dtype=dtype, variant='fp16', use_safetensors=True,
        # Disable automatic downloads during generation: prepare.py downloads first.
        local_files_only=True,
    )
    loaded.scheduler = DPMSolverMultistepScheduler.from_config(loaded.scheduler.config)
    loaded = loaded.to(device)
    loaded.enable_attention_slicing()
    loaded.vae.enable_slicing()
    loaded.set_progress_bar_config(disable=True)
    pipeline = loaded
    state.update(status='ready', device=device)
    print(json.dumps({'event': 'local_model_loaded', 'model': MODEL, 'device': device}), flush=True)
    return pipeline

@app.get('/health')
def health(x_mekan_local_token: str | None = Header(default=None)):
    authorize(x_mekan_local_token)
    return {**state, 'provider': 'local', 'model': MODEL, 'paid_api_enabled': False}

@app.post('/edit')
def edit(image: UploadFile = File(...), prompt: str = Form(...),
         x_mekan_local_token: str | None = Header(default=None)):
    authorize(x_mekan_local_token)
    if not lock.acquire(blocking=False):
        raise HTTPException(429, 'Local model is busy; retry after the current generation')
    try:
        raw = image.file.read(MAX_BYTES + 1)
        if not raw or len(raw) > MAX_BYTES or len(prompt) > 10000:
            raise HTTPException(400, 'Input exceeds limits')
        if image.content_type not in ('image/png', 'image/jpeg', 'image/webp'):
            raise HTTPException(400, 'Unsupported image type')
        try:
            source = Image.open(io.BytesIO(raw))
            source.load()
            source = ImageOps.exif_transpose(source).convert('RGB')
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            raise HTTPException(400, 'Invalid image')
        if min(source.size) < 64:
            raise HTTPException(400, 'Image too small')
        ratio = 512 / max(source.size)
        width, height = [max(64, (round(v * ratio) // 8) * 8) for v in source.size]
        source = source.resize((width, height), Image.Resampling.LANCZOS)
        pipe = load_pipeline()
        state['status'] = 'generating'
        import torch
        seed = secrets.randbelow(2**31)
        # SD1.5 has a short text context; lead with the room/style instruction.
        compact_prompt = 'professional interior photograph, ' + prompt.split('.')[0][:380] + ', natural light, realistic furniture, detailed textures'
        with torch.inference_mode():
            result = pipe(prompt=compact_prompt, image=source, strength=0.45,
                num_inference_steps=24, guidance_scale=7.0,
                negative_prompt='distorted walls, warped geometry, extra doors, blurry, text, watermark, deformed furniture',
                generator=torch.Generator(device='cpu').manual_seed(seed))
        if result.nsfw_content_detected and any(result.nsfw_content_detected):
            raise HTTPException(422, 'Model could not return an acceptable image; retry')
        rendered = result.images[0]
        output = io.BytesIO()
        rendered.save(output, format='PNG')
        state['status'] = 'ready'
        return {'data': [{'b64_json': base64.b64encode(output.getvalue()).decode()}],
                'model': MODEL, 'seed': seed, 'width': width, 'height': height,
                'provider': 'local', 'api_cost': 0}
    except HTTPException:
        state['status'] = 'ready' if pipeline is not None else 'not_loaded'
        raise
    except Exception as exc:
        state.update(status='error', error=type(exc).__name__)
        print(json.dumps({'event':'local_generation_failed', 'error':type(exc).__name__}), flush=True)
        raise HTTPException(503, 'Local model is unavailable or memory is insufficient; check local service logs')
    finally:
        lock.release()
        if pipeline is not None and state['device'] == 'mps':
            import torch
            torch.mps.empty_cache()

if __name__ == '__main__':
    if not TOKEN:
        raise SystemExit('Set LOCAL_AI_TOKEN in the project .env first')
    uvicorn.run(app, host='127.0.0.1', port=7861, access_log=False)
