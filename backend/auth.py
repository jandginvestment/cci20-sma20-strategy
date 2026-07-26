"""
Cognito JWT authentication dependency for FastAPI.

Flow
────
1. Angular does PKCE login → Cognito Hosted UI → receives access_token (JWT).
2. Angular sends:  Authorization: Bearer <access_token>
3. FastAPI (this module) validates signature against Cognito JWKS public keys.
4. On success, auto-creates a User row for first-time logins (upsert pattern).
5. Returns the User ORM instance — downstream handlers can use it freely.

Environment variables
  COGNITO_REGION       e.g. ap-southeast-1
  COGNITO_USER_POOL_ID e.g. ap-southeast-1_XXXXXXXX
  COGNITO_APP_CLIENT_ID  e.g. 5xxxxxxxxxxxxxxxxxxxx
"""
from __future__ import annotations

import logging
import os
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.connection import get_db
from db.models import User

logger = logging.getLogger(__name__)

COGNITO_REGION        = os.environ.get("COGNITO_REGION", "ap-southeast-1")
COGNITO_USER_POOL_ID  = os.environ.get("COGNITO_USER_POOL_ID", "")
COGNITO_APP_CLIENT_ID = os.environ.get("COGNITO_APP_CLIENT_ID", "")

JWKS_URL = (
    f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com"
    f"/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
)

# Cached per Lambda warm instance — avoids a network call on every request
_jwks_keys: Optional[list] = None

security = HTTPBearer(auto_error=True)


async def _fetch_jwks() -> list:
    global _jwks_keys
    if _jwks_keys is None:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(JWKS_URL)
            resp.raise_for_status()
            _jwks_keys = resp.json().get("keys", [])
        logger.info("Fetched %d Cognito JWKS keys", len(_jwks_keys))
    return _jwks_keys


def _find_key(kid: str, keys: list) -> Optional[dict]:
    return next((k for k in keys if k.get("kid") == kid), None)


_401 = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency.
    Validates Cognito JWT and returns (or auto-creates) the User ORM row.
    """
    token = credentials.credentials
    try:
        # 1. Decode header (unverified) to get key id
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise _401

        # 2. Find matching public key
        keys = await _fetch_jwks()
        key  = _find_key(kid, keys)
        if not key:
            # Key may have been rotated — flush cache and retry once
            global _jwks_keys
            _jwks_keys = None
            keys = await _fetch_jwks()
            key  = _find_key(kid, keys)
        if not key:
            raise _401

        # 3. Verify signature, expiry, and audience
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=COGNITO_APP_CLIENT_ID or None,
            options={"verify_exp": True, "verify_aud": bool(COGNITO_APP_CLIENT_ID)},
        )
    except JWTError as exc:
        logger.warning("JWT validation failed: %s", exc)
        raise _401 from exc

    cognito_sub: str = payload.get("sub", "")
    email: str       = payload.get("email", "") or payload.get("cognito:username", "")

    if not cognito_sub:
        raise _401

    # 4. Get or create User row (upsert on first login)
    result = await db.execute(select(User).where(User.cognito_sub == cognito_sub))
    user   = result.scalar_one_or_none()
    if not user:
        user = User(cognito_sub=cognito_sub, email=email)
        db.add(user)
        await db.flush()
        logger.info("Auto-created user cognito_sub=%s", cognito_sub)

    return user
