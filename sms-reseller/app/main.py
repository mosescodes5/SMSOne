from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
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


# Development CORS.
# Before production, replace "*" with your actual frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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