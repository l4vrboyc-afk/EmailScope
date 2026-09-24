/**
 * Engine Mode Router — transport-aware investigation dispatch.
 *
 * ThreatScope runs in two environments:
 *
 *  1. NATIVE   — inside the Tauri desktop shell (`window.__TAURI_INTERNALS__`
 *                present). Investigations are spawned by the Rust host via
 *                the `run_investigation` IPC command, which drives the Python
 *                sidecar.
 *  2. BROWSER  — a plain browser tab (e.g. `npm run dev` opened in Chrome).
 *                There is no Tauri IPC bridge here: calling `invoke()`
 *                crashes with "Cannot read properties of undefined (reading
 *                'invoke')". In this mode we route to the pure-frontend
 *                live-web engine (`runLiveWebInvestigation`), which queries
 *                public OSINT endpoints directly from the browser.
 *
 * Every call site in the app MUST go through this module instead of importing
 * `./ipc` directly, so the UI works identically in both modes.
 */

import type {
  InvestigationRequest,
  SidecarResponse,
} from "./types";
import {
  runInvestigation,
  cancelInvestigation,
  isProgressUpdate,
  isInvestigationResult,
  isErrorResponse,
} from "./ipc";
import { runLiveWebInvestigation } from "./liveWebFetchers";
import { getAllActiveApiKeys } from "../utils/apiKeys";

export { isProgressUpdate, isInvestigationResult, isErrorResponse };

/** True when running inside the Tauri desktop webview. */
export const isTauriEngine: boolean =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export type EngineMode = "native" | "browser";

/** Human-readable label for the active engine mode. */
export const engineMode: EngineMode = isTauriEngine ? "native" : "browser";

/** Stages emulated by the browser engine so the progress HUD still animates. */
const BROWSER_STAGES: Array<"fetching_osint" | "deduplicating_graph" | "assessing_risk" | "generating_narrative"> = [
  "fetching_osint",
  "deduplicating_graph",
  "assessing_risk",
  "generating_narrative",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs a full investigation through the correct transport for the current
 * runtime. Yields the same `SidecarResponse` stream shape in both modes, so
 * callers need zero mode-specific handling.
 */
export async function* runEngineInvestigation(
  request: InvestigationRequest
): AsyncGenerator<SidecarResponse, void, unknown> {
  if (isTauriEngine) {
    yield* runInvestigation(request);
    return;
  }

  // ── Browser mode: live-web fallback ────────────────────────────────────
  try {
    for (const stage of BROWSER_STAGES) {
      yield { status: "progress", stage };
      await sleep(350);
    }

    const { payload, risk, narrative } = await runLiveWebInvestigation(
      request.value,
      request.type,
      getAllActiveApiKeys()
    );
    yield { status: "success", payload, risk, narrative };
  } catch (err) {
    yield {
      status: "error",
      message:
        err instanceof Error
          ? err.message
          : `Browser engine failure: ${String(err)}`,
    };
  }
}

/**
 * Cancels the active investigation. In native mode this kills the sidecar
 * process via IPC; in browser mode the live-web run is short-lived and
 * untrackable from here, so this is a safe no-op.
 */
export async function cancelEngineInvestigation(): Promise<string> {
  if (isTauriEngine) {
    return cancelInvestigation();
  }
  return "cancelled (browser mode)";
}
