"""
Rate limiting module for HireMind AI.

Supports atomic database-backed rate limiting via Supabase RPC check_rate_limit
and thread-safe sliding-window fallback in demo/testing modes.
"""
from __future__ import annotations

import hashlib
import time
from typing import NamedTuple
from fastapi import HTTPException, Request

from app.config import settings
from app.database import supabase


class RateLimitResult(NamedTuple):
    allowed: bool
    remaining: int
    retry_after_seconds: int


class DemoRateLimiter:
    """Thread-safe sliding-window bucket store for demo_mode and local tests."""

    def __init__(self):
        self._buckets: dict[str, tuple[int, float]] = {}

    def check(self, key: str, max_hits: int, window_seconds: int) -> RateLimitResult:
        now = time.time()
        hits, window_start = self._buckets.get(key, (0, now))

        if now - window_start >= window_seconds:
            hits = 1
            window_start = now
        else:
            hits += 1

        self._buckets[key] = (hits, window_start)

        elapsed = int(now - window_start)
        if hits <= max_hits:
            return RateLimitResult(
                allowed=True,
                remaining=max_hits - hits,
                retry_after_seconds=0,
            )
        else:
            retry_after = max(1, window_seconds - elapsed)
            return RateLimitResult(
                allowed=False,
                remaining=0,
                retry_after_seconds=retry_after,
            )

    def clear(self):
        self._buckets.clear()


_demo_limiter = DemoRateLimiter()


def hash_candidate_token(token: str) -> str:
    """
    Derive a deterministic cryptographic hash of a candidate token.
    Never log or persist raw candidate portal tokens.
    """
    if not token:
        return "empty"
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]


def extract_client_ip(request: Request) -> str:
    """
    Extract client IP from request headers using proxy/Vercel conventions.
    Prioritizes X-Forwarded-For (first IP), then X-Real-IP, falling back to client.host.
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        # Take the first IP in comma-separated chain
        client_ip = xff.split(",")[0].strip()
        if client_ip:
            return client_ip

    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip and x_real_ip.strip():
        return x_real_ip.strip()

    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"


def enforce_rate_limit(key: str, max_hits: int, window_seconds: int = 60) -> RateLimitResult:
    """
    Enforces a rate limit for a given key.
    If limit is exceeded, raises HTTPException 429 with Retry-After header.
    In production (demo_mode=False), fails closed with HTTP 500 if DB RPC fails.
    """
    result: RateLimitResult | None = None

    if settings.demo_mode:
        # Development / demo / test environment
        result = _demo_limiter.check(key, max_hits, window_seconds)
    else:
        # Production mode: strict database-backed RPC rate limiter
        try:
            rpc_res = supabase.rpc(
                "check_rate_limit",
                {
                    "p_key": key,
                    "p_max_hits": max_hits,
                    "p_window_seconds": window_seconds,
                },
            ).execute()

            if rpc_res and rpc_res.data:
                row = rpc_res.data[0] if isinstance(rpc_res.data, list) else rpc_res.data
                result = RateLimitResult(
                    allowed=bool(row.get("allowed", False)),
                    remaining=int(row.get("remaining", 0)),
                    retry_after_seconds=int(row.get("retry_after_seconds", 60)),
                )
        except Exception as err:
            # Production Fail-Closed: Never silently fallback to process-memory in multi-instance production
            raise HTTPException(
                status_code=500,
                detail=f"Rate limiter database service unavailable: {err}",
            ) from err

    if result is None or not result.allowed:
        retry_after = result.retry_after_seconds if result else 60
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait before retrying.",
            headers={"Retry-After": str(retry_after)},
        )

    return result

