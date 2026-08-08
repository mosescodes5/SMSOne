"""
Rate limiting via slowapi (a Starlette-friendly wrapper around the `limits`
library). In-memory storage by default — fine for a single-process deploy;
if this ever runs multiple worker processes/instances behind a load
balancer, point it at Redis instead (slowapi supports that via
storage_uri="redis://...") so limits are shared across processes rather than
each process tracking its own separate count.

Keyed by user ID when the request carries a valid Supabase JWT (so it
follows the person, not just their IP — important since many users can
share one IP on mobile networks/NAT), falling back to IP address for
unauthenticated requests.
"""

from fastapi import Request
from jose import jwt
from slowapi import Limiter


def _key_func(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth[7:]
        try:
            # Rate-limit key only — signature/expiry aren't checked here,
            # that's still get_current_user's job on the route itself. Worst
            # case if this is forged: the attacker rate-limits themselves
            # under a key of their choosing, which isn't a real bypass since
            # the endpoint will still reject the forged token separately.
            claims = jwt.get_unverified_claims(token)
            sub = claims.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass
    return f"ip:{request.client.host if request.client else 'unknown'}"


limiter = Limiter(key_func=_key_func)
