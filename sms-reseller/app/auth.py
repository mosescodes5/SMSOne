"""
Auth is entirely Supabase's job now: the frontend calls supabase-js directly
for signup/login/password-reset/email-verification, and Supabase issues a
JWT. This module's only responsibility is verifying that JWT on incoming
requests and making sure the user has a wallet row (normally already true —
a Postgres trigger creates one on signup, see supabase_schema.sql — but
get_or_create is a safe fallback for local dev against SQLite, where that
trigger doesn't exist).

Supabase projects sign tokens one of two ways, and there's no way to tell
which from outside the dashboard without just checking:
  - Legacy: HS256, shared secret (Settings -> API -> JWT Secret)
  - Newer: asymmetric (ES256/RS256), verified via a public JWKS endpoint —
    no shared secret involved at all
`_verify_supabase_jwt` below reads the `alg` straight out of the token's own
header and verifies accordingly, so this works either way without needing
to know in advance which one a given project uses.
"""

import time
import uuid
from dataclasses import dataclass

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlmodel import Session

from app.config import settings
from app.database import get_session
from app.models import Wallet

bearer_scheme = HTTPBearer(auto_error=True)

# Cached JWKS (public keys for asymmetric projects) with a short TTL — avoids
# fetching on every single request, but still picks up key rotation without
# needing a restart.
_jwks_cache: dict = {"keys": None, "fetched_at": 0}
_JWKS_TTL_SECONDS = 3600


def _get_jwks(force_refresh: bool = False) -> list[dict]:
    now = time.time()
    stale = now - _jwks_cache["fetched_at"] > _JWKS_TTL_SECONDS
    if _jwks_cache["keys"] is None or stale or force_refresh:
        url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        _jwks_cache["keys"] = resp.json()["keys"]
        _jwks_cache["fetched_at"] = now
    return _jwks_cache["keys"]


def _verify_supabase_jwt(token: str) -> dict:
    header = jwt.get_unverified_header(token)
    alg = header.get("alg")

    if alg == "HS256":
        # Legacy shared-secret project.
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )

    # Asymmetric project (ES256/RS256) — find the matching public key by kid.
    kid = header.get("kid")
    keys = _get_jwks()
    key_data = next((k for k in keys if k.get("kid") == kid), None)
    if key_data is None:
        # Key rotated since we last cached — refetch once before giving up.
        keys = _get_jwks(force_refresh=True)
        key_data = next((k for k in keys if k.get("kid") == kid), None)
    if key_data is None:
        raise JWTError(f"No matching JWKS key for kid={kid}")

    return jwt.decode(
        token,
        key_data,
        algorithms=[key_data.get("alg", alg)],
        audience="authenticated",
    )


@dataclass
class CurrentUser:
    id: uuid.UUID
    email: str
    wallet_balance_ngn: float
    is_admin: bool
    is_suspended: bool


import logging

logger = logging.getLogger("relay.auth")


def _admin_emails() -> set[str]:
    return {e.strip().lower() for e in settings.admin_emails.split(",") if e.strip()}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> CurrentUser:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = _verify_supabase_jwt(credentials.credentials)
    except (JWTError, httpx.HTTPError) as e:
        # Client only ever sees the generic 401 above — this print is so
        # *you* can see the real reason in the terminal running uvicorn,
        # without leaking verification internals to whoever's calling the API.
        logger.warning("JWT verification failed: %s: %s", type(e).__name__, e)
        raise credentials_error

    sub = payload.get("sub")
    email = payload.get("email")
    if not sub or not email:
        logger.warning("Token verified but missing sub/email claims: %s", payload)
        raise credentials_error

    try:
        user_id = uuid.UUID(sub)
    except ValueError:
        raise credentials_error

    wallet = get_or_create_wallet(session, user_id, email=email)

    is_admin = wallet.is_admin or email.lower() in _admin_emails()

    if wallet.is_suspended:
        raise HTTPException(status_code=403, detail="This account has been suspended. Contact support.")

    return CurrentUser(
        id=user_id,
        email=email,
        wallet_balance_ngn=wallet.wallet_balance_ngn,
        is_admin=is_admin,
        is_suspended=wallet.is_suspended,
    )


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def get_or_create_wallet(session: Session, user_id: uuid.UUID, email: str | None = None) -> Wallet:
    """
    Normally a no-op fallback — the Postgres trigger in supabase_schema.sql
    already creates the wallet row at signup. This exists so local dev
    against plain SQLite (no trigger support) still works, and as a safety
    net if a user somehow reaches the backend before the trigger's committed.
    Also keeps the cached `email` column fresh, since Supabase lets users
    change their email after signup.
    """
    wallet = session.get(Wallet, user_id)
    if wallet is None:
        wallet = Wallet(user_id=user_id, wallet_balance_ngn=0.0, email=email)
        session.add(wallet)
        session.commit()
        session.refresh(wallet)
    elif email and wallet.email != email:
        wallet.email = email
        session.add(wallet)
        session.commit()
        session.refresh(wallet)
    return wallet