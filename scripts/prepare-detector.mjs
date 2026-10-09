import { spawnSync } from "node:child_process";
import path from "node:path";
import "dotenv/config";
const python = process.env.DETECTOR_PYTHON || path.resolve(process.platform === "win32" ? ".local-ai/venv/Scripts/python.exe" : ".local-ai/venv/bin/python");
const result = spawnSync(python, ["local_ai/detect.py", "--prepare"], { stdio: "inherit", env: process.env });
if (result.error) console.error("Python mühitini yaradın və local_ai/detection-requirements.txt paketlərini quraşdırın.");
process.exitCode = result.status ?? 1;
