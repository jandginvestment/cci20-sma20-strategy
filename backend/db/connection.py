"""
Database connection factory.

Two drivers — one per execution context:
  • Async (asyncpg)  — FastAPI Lambda: non-blocking, one connection per Lambda instance.
  • Sync  (psycopg2) — Scanner Lambda: runs outside async event loop.

Environment variables
  DATABASE_URL       postgresql+asyncpg://user:pass@host/db?sslmode=require
  DATABASE_URL_SYNC  postgresql://user:pass@host/db?sslmode=require
                     (auto-derived from DATABASE_URL if omitted)
"""
from __future__ import annotations

import os
from typing import AsyncGenerator, Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import (
    AsyncSession, async_sessionmaker, create_async_engine,
)
from sqlalchemy.orm import Session, sessionmaker

# ── Async engine (API Lambda) ──────────────────────────────────────────────────

_async_engine = None
_async_session_factory: async_sessionmaker | None = None


def _build_async_engine():
    global _async_engine, _async_session_factory
    if _async_engine is None:
        url = os.environ["DATABASE_URL"]
        if not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        _async_engine = create_async_engine(
            url,
            pool_size=1,       # Lambda: one connection per warm instance
            max_overflow=0,
            pool_pre_ping=True,    # detect Neon auto-paused connections
            pool_recycle=280,      # recycle before Neon 300 s idle timeout
            echo=os.environ.get("SQL_ECHO", "").lower() == "true",
        )
        _async_session_factory = async_sessionmaker(
            _async_engine,
            expire_on_commit=False,
            class_=AsyncSession,
        )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a managed async session."""
    _build_async_engine()
    assert _async_session_factory is not None
    async with _async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ── Sync engine (Scanner Lambda) ──────────────────────────────────────────────

def get_sync_session() -> Generator[Session, None, None]:
    """Sync session for the scanner (psycopg2). Disposes engine on exit."""
    raw = os.environ.get("DATABASE_URL_SYNC") or os.environ["DATABASE_URL"]
    url = raw.replace("+asyncpg", "").replace("postgresql+psycopg2://", "postgresql://")
    if not url.startswith("postgresql://"):
        url = url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(url, pool_pre_ping=True, pool_size=1, max_overflow=0)
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        engine.dispose()
