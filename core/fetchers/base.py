"""Abstract base class for all ThreatScope OSINT fetcher modules.

Every future fetcher (Breach databases, Social handles, Telephony,
Reverse WHOIS) must inherit from :class:`BaseFetcher` and implement
:meth:`BaseFetcher.fetch`.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict

import httpx

from core.schemas import SeedInput


class BaseFetcher(ABC):
    """Abstract Base Class for all ThreatScope OSINT Modules."""

    def __init__(self, name: str, timeout: float = 2.5):
        self.name = name
        self.timeout = timeout

    @abstractmethod
    async def fetch(self, seed: SeedInput, client: httpx.AsyncClient) -> Dict[str, Any]:
        """Executes the module fetch logic asynchronously.

        Must return a structured dictionary with at least a 'status' key.
        'status' should be 'success', 'skipped', or 'failed'.
        """
        pass
