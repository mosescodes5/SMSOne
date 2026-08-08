"""
No register/login routes here anymore — the frontend calls supabase-js
directly for signup, login, password reset, and email verification, all of
which Supabase Auth handles natively. This router just exposes a way to
confirm a token is valid and a wallet exists, which is handy for the
frontend to call right after a fresh signup/login.
"""

from fastapi import APIRouter, Depends

from app.auth import CurrentUser, get_current_user
from app.schemas import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserRead)
def read_current_user(user: CurrentUser = Depends(get_current_user)):
    return UserRead(id=user.id, email=user.email, wallet_balance_ngn=user.wallet_balance_ngn, is_admin=user.is_admin)
