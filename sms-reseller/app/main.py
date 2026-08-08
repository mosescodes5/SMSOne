from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.database import init_db
from app.rate_limit import limiter
from app.routers import (
    admin,
    auth,
    orders,
    payments,
    providers,
    settings,
    wallet,
)


app = FastAPI(
    title="SMS Reseller API",
    version="0.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# Development CORS.
# Before production, replace "*" with your actual frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://sms-one-three.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(auth.router)
app.include_router(wallet.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(settings.router)
app.include_router(admin.router)
app.include_router(providers.router)


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "sms-reseller-api",
    }