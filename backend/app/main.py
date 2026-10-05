from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.database import init_db
from app.routes import auth, admin, classes, voters, elections, voting, audit

settings = get_settings()

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup."""
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - allow frontend and LAN access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for LAN access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


_db_initialized = False


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Add security headers to all responses and ensure DB is initialized."""
    global _db_initialized
    if not _db_initialized:
        try:
            await init_db()
            _db_initialized = True
        except Exception as e:
            print(f"Serverless DB init notice: {e}")

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(classes.router, prefix="/api")
app.include_router(voters.router, prefix="/api")
app.include_router(elections.router, prefix="/api")
app.include_router(voting.router, prefix="/api")
app.include_router(audit.router, prefix="/api")


from app.database import get_db, async_session_factory
from sqlalchemy import select
from app.models.admin import Admin


@app.get("/api/health")
async def health_check():
    """Health check endpoint with DB status."""
    db_status = "ok"
    admin_list = []
    try:
        await init_db()
        async with async_session_factory() as session:
            res = await session.execute(select(Admin.username))
            admin_list = [r[0] for r in res.all()]
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "app": settings.APP_NAME,
        "db": db_status,
        "admin_count": len(admin_list),
        "admins": admin_list
    }
