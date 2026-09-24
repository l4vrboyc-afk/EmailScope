"""In-memory token bucket rate limiting.

When orchestrating many OSINT modules (or recursively layered seeds at depth
3+), unthrottled parallel requests invite IP bans / HTTP 429s from third-party
APIs (HaveIBeenPwned, VirusTotal, AbuseIPDB, ...). This bucketing limiter
guarantees smooth, stealthy execution by never exceeding a configured requests
per second — even when hundreds of coroutines are dispatched at once.
"""

import asyncio
import time


class TokenBucket:
    """An asyncio-native leaky token bucket.

    ``capacity`` tokens may be consumed immediately (a burst), but ho tokens
    are replenished at ``rate`` tokens/second. Consumers await
    :meth:`acquire` until a token is available, which flattens any burst into
    a steady average rate.
    """

    __slots__ = ("capacity", "rate", "_tokens", "_updated_at", "_lock")

    def __init__(self, rate: float = 5.0, capacity: int = 10):
        if rate <= 0:
            raise ValueError("rate must be greater than 0")
        if capacity < 1:
            raise ValueError("capacity must be at least 1")

        self.capacity = int(capacity)
        self.rate = float(rate)
        self._tokens = float(self.capacity)
        self._updated_at = time.monotonic()
        self._lock = asyncio.Lock()

    def _refill(self) -> None:
        """Top up tokens based on elapsed time (never exceeds capacity)."""
        now = time.monotonic()
        elapsed = now - self._updated_at
        self._tokens = min(self.capacity, self._tokens + elapsed * self.rate)
        self._updated_at = now

    async def acquire(self) -> None:
        """Block until a token is available, consuming one when acquired."""
        while True:
            async with self._lock:
                self._refill()
                if self._tokens >= 1:
                    self._tokens -= 1
                    return
                wait = (1 - self._tokens) / self.rate
            # Release the lock while waiting so other coroutines can refill.
            await asyncio.sleep(wait)

    async def __aenter__(self) -> "TokenBucket":
        await self.acquire()
        return self

    async def __aexit__(self, *exc: object) -> None:
        return None