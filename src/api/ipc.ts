/**
 * Tauri IPC bridge — TypeScript wrapper for invoking Rust commands.
 *
 * Uses `@tauri-apps/api` to call the Rust commands defined in
 * `src-tauri/src/main.rs`:
 *   - `run_investigation` — spawns the sidecar, streams progress + results
 *   - `cancel_investigation` — kills the sidecar process
 *   - `ping_sidecar` — health check
 *
 * The Rust `run_investigation` command returns a newline-separated string
 * of JSON lines. This wrapper parses each line into a typed `SidecarResponse`.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  InvestigationRequest,
  SidecarResponse,
  ProgressUpdate,
  InvestigationResult,
  ErrorResponse,
} from "./types";

/**
 * Invokes the `run_investigation` Rust command.
 *
 * Returns an async generator that yields progressive results —
 * first `ProgressUpdate` objects as each stage completes, then a
 * final `InvestigationResult` (or `ErrorResponse`).
 *
 * Usage:
 *   for await (const response of runInvestigation({ value: "test@gmail.com", type: "email" })) {
 *     if (response.status === "progress") { // show spinner }
 *     if (response.status === "success") { // show results }
 *   }
 */
export async function* runInvestigation(
  request: InvestigationRequest
): AsyncGenerator<SidecarResponse, void, unknown> {
  // The Rust command returns a newline-separated string of JSON lines.
  // We parse each line and yield it to the caller.
  const rawOutput: string = await invoke("run_investigation", {
    request,
  });

  const lines = rawOutput.split("\n").filter((line) => line.trim() !== "");

  for (const line of lines) {
    const response = JSON.parse(line) as SidecarResponse;
    yield response;
  }
}

/**
 * Invokes the `cancel_investigation` Rust command.
 *
 * Kills the currently running sidecar process to reclaim system resources.
 * Can be called when the user clicks a "Cancel" button or starts a new search.
 */
export async function cancelInvestigation(): Promise<string> {
  return await invoke("cancel_investigation");
}

/**
 * Invokes the `ping_sidecar` Rust command.
 *
 * A lightweight health check that verifies the sidecar binary
 * is installed and responsive.
 */
export async function pingSidecar(): Promise<string> {
  return await invoke("ping_sidecar");
}

/**
 * Type guard: checks if a response is a ProgressUpdate.
 */
export function isProgressUpdate(
  response: SidecarResponse
): response is ProgressUpdate {
  return response.status === "progress";
}

/**
 * Type guard: checks if a response is a final InvestigationResult.
 */
export function isInvestigationResult(
  response: SidecarResponse
): response is InvestigationResult {
  return response.status === "success";
}

/**
 * Type guard: checks if a response is an ErrorResponse.
 */
export function isErrorResponse(
  response: SidecarResponse
): response is ErrorResponse {
  return response.status === "error";
}
