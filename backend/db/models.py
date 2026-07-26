"""
SQLAlchemy 2.0 ORM models — replaces Couchbase KV documents.

Document → Table mapping
  index::watchlists         → watchlists  (per-user)
  results::{name}           → scan_runs + scan_results
"""
from __future__ import annotations

import uuid
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    Index, Integer, Numeric, String, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


# ── Users ──────────────────────────────────────────────────────────────────────

class User(Base):
    """Cognito-authenticated user — created automatically on first JWT login."""
    __tablename__ = "users"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cognito_sub   = Column(String(128), unique=True, nullable=False, index=True)
    email         = Column(String(255), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    watchlists = relationship(
        "Watchlist", back_populates="user", cascade="all, delete-orphan"
    )


# ── Watchlists ─────────────────────────────────────────────────────────────────

class Watchlist(Base):
    """A named CSV watchlist owned by a user."""
    __tablename__ = "watchlists"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_watchlist_user_name"),
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    name       = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user      = relationship("User", back_populates="watchlists")
    scan_runs = relationship(
        "ScanRun", back_populates="watchlist", cascade="all, delete-orphan"
    )


# ── Scan Runs ──────────────────────────────────────────────────────────────────

class ScanRun(Base):
    """One complete execution of the scanner for a single watchlist.
    Keeps full history — never deleted unless the watchlist is deleted.
    """
    __tablename__ = "scan_runs"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id", ondelete="CASCADE"),
                          nullable=False, index=True)
    scanned_at   = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ticker_count = Column(Integer, nullable=True)

    watchlist = relationship("Watchlist", back_populates="scan_runs")
    results   = relationship(
        "ScanResult", back_populates="scan_run", cascade="all, delete-orphan"
    )


# ── Scan Results ───────────────────────────────────────────────────────────────

class ScanResult(Base):
    """One ticker's computed metrics within a ScanRun."""
    __tablename__ = "scan_results"
    __table_args__ = (
        Index("ix_scan_results_run_id", "scan_run_id"),
    )

    id           = Column(Integer, primary_key=True, autoincrement=True)
    scan_run_id  = Column(Integer, ForeignKey("scan_runs.id", ondelete="CASCADE"),
                          nullable=False)
    ticker       = Column(String(20), nullable=False)

    # Price metrics
    close        = Column(Numeric(14, 4))
    cci_20       = Column(Numeric(10, 4))
    sma_20       = Column(Numeric(14, 4))

    # Low anchors
    yearly_low   = Column(Numeric(14, 4))
    monthly_low  = Column(Numeric(14, 4))
    weekly_low   = Column(Numeric(14, 4))

    # Distance from lows (%)
    pct_from_y_low = Column(Numeric(8, 4))
    pct_from_m_low = Column(Numeric(8, 4))
    pct_from_w_low = Column(Numeric(8, 4))

    # Boolean proximity flags (within 5%)
    near_y_low = Column(Boolean)
    near_m_low = Column(Boolean)
    near_w_low = Column(Boolean)

    # Last 20 CCI values for sparkline
    cci_history = Column(JSONB)  # list[float]

    scan_run = relationship("ScanRun", back_populates="results")
