"""Furniture detection. --prepare downloads public weights; inference stays offline."""
import os
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("HF_HOME", str(ROOT / ".local-ai" / "models"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
import sys
import json
import io
import base64
from PIL import Image
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
import torch

MODEL = "IDEA-Research/grounding-dino-tiny"
LABELS = "sofa. armchair. chair. coffee table. desk. dining table. bed. wardrobe. shelf. floor lamp."

def run():
    prepare = "--prepare" in sys.argv
    processor = AutoProcessor.from_pretrained(MODEL, local_files_only=not prepare)
    model = AutoModelForZeroShotObjectDetection.from_pretrained(MODEL, local_files_only=not prepare).eval()
    if prepare:
        print(json.dumps({"prepared": MODEL}))
        return
    raw = sys.stdin.buffer.read(15 * 1024 * 1024 + 1)
    if len(raw) > 15 * 1024 * 1024:
        raise ValueError("Input exceeds limit")
    payload = json.loads(raw)
    image = Image.open(io.BytesIO(base64.b64decode(payload["image"], validate=True))).convert("RGB")
    image.thumbnail((1000, 1000))
    torch.set_num_threads(2)
    inputs = processor(images=image, text=LABELS, return_tensors="pt")
    with torch.inference_mode():
        outputs = model(**inputs)
    detected = processor.post_process_grounded_object_detection(outputs, inputs.input_ids, threshold=0.30, text_threshold=0.25, target_sizes=[image.size[::-1]])[0]
    items = []
    for box, score, label in zip(detected["boxes"], detected["scores"], detected["text_labels"]):
        label = label.lower()
        category = ("sofa" if "sofa" in label else "chair" if "chair" in label else "table" if "table" in label or "desk" in label else "bed" if "bed" in label else "lighting" if "lamp" in label else "storage" if "wardrobe" in label or "shelf" in label else None)
        if not category:
            continue
        x1, y1, x2, y2 = box.tolist()
        x1, y1 = max(0, x1 / image.width), max(0, y1 / image.height)
        x2, y2 = min(1, x2 / image.width), min(1, y2 / image.height)
        if x2 <= x1 or y2 <= y1:
            continue
        current = [x1, y1, x2 - x1, y2 - y1]
        duplicate = False
        for prev in items:
            if prev["category"] != category:
                continue
            px, py, pw, ph = prev["box"]
            intersection = max(0, min(x2, px + pw) - max(x1, px)) * max(0, min(y2, py + ph) - max(y1, py))
            if intersection / max(1e-9, current[2] * current[3] + pw * ph - intersection) > 0.5:
                duplicate = True
        if not duplicate:
            items.append({"id": f"furniture-{len(items) + 1}", "category": category, "label": label, "score": round(float(score), 4), "box": current, "productIds": []})
        if len(items) >= 30:
            break
    print(json.dumps(items))

if __name__ == "__main__":
    try:
        run()
    except Exception as error:
        print(json.dumps({"error": type(error).__name__, "message": "Furniture detector unavailable. Run npm run ai:detect:prepare."}), file=sys.stderr)
        sys.exit(1)
