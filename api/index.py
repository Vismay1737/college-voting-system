import sys
import os
from pathlib import Path

# Resolve paths relative to this file (api/index.py)
project_root = Path(__file__).resolve().parent.parent
backend_dir = str(project_root / "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Optionally load .env from project root (for local `vercel dev`)
env_file = project_root / ".env"
if env_file.is_file():
    try:
        from dotenv import load_dotenv
        load_dotenv(env_file)
    except ImportError:
        pass  # python-dotenv not required if env vars are set by Vercel

from app.main import app
