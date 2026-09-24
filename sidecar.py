"""Engine Sidecar Entrypoint — stdin/stdout IPC bridge for Tauri desktop shell.

The Tauri (Rust) frontend launches this Python script as a background sidecar
process and sends JSON-RPC commands via stdin.  The sidecar executes the full
investigation pipeline (Fetchers → Deduplication → Risk Engine → Narrative
Summary) and streams **Server-Sent Events** (SSE) to stdout so the frontend
can display live progress pulses in real-time, followed by the final
complete JSON bundle.

Protocol
--------
Every output line is a JSON object on stdout.  Lines are either:

1. **Progress updates** (emitted before each stage) ::

    {"status": "progress", "stage": "fetching_osint"}

2. **Final bundle** (emitted after all stages) ::

    {"status": "success", "payload": {...}, "risk": {...}, "narrative": {...}}

The Rust shell and React visualizer can parse stdout line-by-line and switch
to the progress UI as soon as the first ``progress`` event arrives.

Usage
-----
    python sidecar.py

Commands (one JSON object per line on stdin)::

    {"command": "ping"}
    {"command": "investigate", "value": "test@gmail.com", "type": "email"}
"""

import asyncio
import json
import logging
import sys

from core.schemas import SeedInput, SeedType
from core.fetchers.dns_fetcher import DNSFetcher
from core.fetchers.gravatar_fetcher import GravatarFetcher
from core.fetchers.breach_fetcher import BreachFetcher
from core.orchestrator import AsyncOrchestrator
from core.graph_engine import GraphDeduplicator
from core.risk_engine import RiskEngine
from core.narrative import NarrativeEngine

logger = logging.getLogger("threatscope.sidecar")


def emit_progress(stage: str):
    """Emit a real-time progress pulse to stdout.

    This is called *before* each processing-heavy stage so the frontend
    can display live status updates instead of appearing frozen.
    """
    msg = json.dumps({"status": "progress", "stage": stage})
    print(msg, flush=True)


async def process_command(line: str):
    """Parses JSON-RPC input from Rust IPC, executes investigation, and
    streams progress updates + a final JSON response back via stdout.

    Parameters
    ----------
    line:
        A single JSON-encoded command from the parent process.
    """
    try:
        data = json.loads(line)
        cmd = data.get("command")

        if cmd == "investigate":
            seed_val = data.get("value")
            seed_type_str = data.get("type", "email")

            seed = SeedInput(
                value=seed_val, seed_type=SeedType(seed_type_str)
            )

            # Instantiate standard fetcher suite
            fetchers = [
                DNSFetcher(timeout=2.5),
                GravatarFetcher(timeout=2.5),
                BreachFetcher(timeout=2.5),
            ]

            # --- Stage 1: OSINT collection (emit pulse before network I/O) ---
            emit_progress("fetching_osint")
            orchestrator = AsyncOrchestrator(fetchers=fetchers)
            payload = await orchestrator.run_investigation(seed)

            # --- Stage 2: Graph deduplication ---
            emit_progress("deduplicating_graph")
            deduped_payload = GraphDeduplicator().deduplicate(payload)

            # --- Stage 3: Risk assessment ---
            emit_progress("assessing_risk")
            risk_assessment = RiskEngine().evaluate(deduped_payload)

            # --- Stage 4: AI narrative generation ---
            emit_progress("generating_narrative")
            narrative_engine = NarrativeEngine()
            narrative_summary = (
                await narrative_engine.generate_summary(
                    deduped_payload, risk_assessment
                )
            )

            # --- Final bundle ---
            response = {
                "status": "success",
                "payload": deduped_payload.model_dump(mode="json"),
                "risk": risk_assessment.model_dump(mode="json"),
                "narrative": narrative_summary.model_dump(mode="json"),
            }
            print(json.dumps(response), flush=True)

        elif cmd == "ping":
            print(json.dumps({"status": "pong"}), flush=True)

        else:
            print(
                json.dumps(
                    {
                        "status": "error",
                        "message": f"Unknown command: {cmd}",
                    }
                ),
                flush=True,
            )

    except Exception as e:
        logger.exception("Sidecar command processing failed")
        err_res = {"status": "error", "message": str(e)}
        print(json.dumps(err_res), flush=True)


async def main():
    """Main stdin event loop reading commands from the parent Rust process."""
    while True:
        line = await asyncio.to_thread(sys.stdin.readline)
        if not line:
            # EOF — parent process closed stdin
            break
        line = line.strip()
        if line:
            await process_command(line)


if __name__ == "__main__":
    asyncio.run(main())
