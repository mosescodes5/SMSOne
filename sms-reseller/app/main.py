from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import auth, orders, payments, wallet

app = FastAPI(title="SMS Reseller API", version="0.1.0")

# Dev-permissive CORS so the static frontend (served from file:// or any local
# port) can call this API. Before deploying, replace allow_origins with your
# actual frontend domain(s).
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


@app.get("/")
def root():
    return {"status": "ok", "service": "sms-reseller-api"}
