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
from app.database import init_db
import asyncio

# Ensure DB tables & admin exist on cold start
try:
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    if loop.is_running():
        loop.create_task(init_db())
    else:
        loop.run_until_complete(init_db())
except Exception as e:
    print(f"Vercel init_db warning: {e}")

