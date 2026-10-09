"""Download only public model files. No hosted inference or API payment."""
from pathlib import Path
import os
from dotenv import load_dotenv
ROOT=Path(__file__).resolve().parent.parent
load_dotenv(ROOT/'.env')
os.environ.setdefault('HF_HOME',str(ROOT/'.local-ai'/'models'))
os.environ.setdefault('HF_HUB_DISABLE_TELEMETRY','1')
from huggingface_hub import snapshot_download
model=os.getenv('LOCAL_AI_MODEL','stable-diffusion-v1-5/stable-diffusion-v1-5')
print('Downloading local model weights once (~2–3 GB); no paid inference calls.',flush=True)
snapshot_download(repo_id=model,allow_patterns=['model_index.json','*/config.json','*/preprocessor_config.json','*/scheduler_config.json','tokenizer/*','*/*.fp16.safetensors','README.md','LICENSE*'],max_workers=2)
print('Local model download complete.',flush=True)
