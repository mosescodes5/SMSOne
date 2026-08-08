from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import NullPool

from app.config import settings

is_sqlite = settings.database_url.startswith("sqlite")

# On serverless (Vercel), each invocation may be a fresh process — SQLAlchemy's
# own connection pool doesn't carry over between them, so it just adds a layer
# of stale/leaked connections on top of Supabase's own pooler (Supavisor).
# NullPool opens a connection per request and closes it immediately after,
# which is the correct model here. Use Supabase's *pooled* connection string
# (port 6543, "Transaction" mode) as DATABASE_URL, not the direct one (5432) —
# the direct connection has a low connection-count ceiling that many
# concurrent serverless invocations will hit fast.
connect_args = {"check_same_thread": False} if is_sqlite else {}
engine = create_engine(
    settings.database_url,
    echo=False,
    connect_args=connect_args,
    poolclass=None if is_sqlite else NullPool,
)


def init_db() -> None:
    # On Postgres/Supabase, the schema is owned by supabase_schema.sql (run
    # once in the Supabase SQL editor) — it defines things SQLModel can't
    # express directly, like the auto-wallet trigger and RLS policies.
    # Auto-creating tables here would just be a fragile second copy of that
    # schema. Only local SQLite dev (no separate schema file) uses this.
    if is_sqlite:
        SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
