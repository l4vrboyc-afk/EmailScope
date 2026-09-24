//! # ThreatScope Desktop — Rust IPC Process Manager
//!
//! Manages the lifecycle of the `threatscope-engine` sidecar process.
//! When a user submits a search in the UI, Tauri invokes
//! [`run_investigation`], which spawns the sidecar binary, writes the
//! JSON payload to stdin, and collects stdout lines (progress updates +
//! final bundle) before returning them to the frontend.
//!
//! ## Process Lifecycle Upgrade
//!
//! An [`ActiveProcess`] struct is stored as a global Tauri `State`. When a user
//! clicks "Cancel" or starts a new investigation, [`cancel_investigation`] is
//! invoked, which issues `child.kill()` to instantly reclaim system resources
//! before spawning the next search.
//!
//! ## Protocol
//!
//! - **stdin**: one JSON command per line
//! - **stdout**: SSE-style JSON lines (progress pulses) followed by a
//!   final `success` (or `error`) bundle

// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::State;
use tauri_plugin_shell::process::{Child, CommandEvent};
use tauri_plugin_shell::ShellExt;

use std::path::PathBuf;

/// Investigation request from the frontend.
#[derive(serde::Deserialize)]
struct InvestigationRequest {
    value: String,
    #[serde(default = "default_seed_type")]
    r#type: String,
}

fn default_seed_type() -> String {
    "email".to_string()
}

/// Global state tracking the currently running sidecar child process.
///
/// Wrapped in an `Arc<Mutex<Option<Child>>>` so that `run_investigation`
/// (which spawns the process) and `cancel_investigation` (which kills it)
/// can safely share the handle across async tasks.
pub struct ActiveProcess(pub std::sync::Mutex<Option<Child>>);

impl Default for ActiveProcess {
    fn default() -> Self {
        ActiveProcess(std::sync::Mutex::new(None))
    }
}

/// Result returned to the frontend — a JSON string containing all
/// stdout lines (progress + final bundle).
/// The frontend parses each line individually.
#[tauri::command]
async fn run_investigation(
    app: tauri::AppHandle,
    request: InvestigationRequest,
    active: State<'_, ActiveProcess>,
) -> Result<String, String> {
    // If a previous investigation is still running, cancel it first.
    // This prevents orphaned Python sidecar processes from consuming CPU/RAM.
    cancel_investigation_internal(&active);

    // 1. Resolve the sidecar command
    let sidecar_command = app
        .shell()
        .sidecar("threatscope-engine")
        .map_err(|e| format!("Failed to initialize sidecar command: {}", e))?;

    // 2. Spawn the process (non-blocking stdin/stdout pipe)
    let (mut rx, mut child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar process: {}", e))?;

    // Store the child handle so cancel_investigation can kill it later
    {
        let mut guard = active.0.lock().unwrap();
        *guard = Some(child.clone());
    }

    // 3. Format JSON IPC payload for Python stdin
    let payload = format!(
        r#"{{"command":"investigate","value":"{}","type":"{}"}}"#,
        request.value, request.r#type
    );

    // 4. Write command payload to stdin
    child
        .write(format!("{}\n", payload).as_bytes())
        .map_err(|e| format!("Failed to write to sidecar stdin: {}", e))?;
    // Close stdin to signal EOF to the sidecar
    child
        .close_stdin()
        .map_err(|e| format!("Failed to close sidecar stdin: {}", e))?;

    // 5. Collect stdout lines (progress pulses + final bundle)
    let mut output_lines: Vec<String> = Vec::new();

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes).to_string();
                output_lines.push(line);
            }
            CommandEvent::Error(err) => {
                // Clear the active process on error
                clear_active_process(&active);
                return Err(format!("Sidecar process error: {}", err));
            }
            CommandEvent::Terminated(_) => {
                break;
            }
            _ => {}
        }
    }

    // Clear the active process reference on completion
    clear_active_process(&active);

    if output_lines.is_empty() {
        return Err("Sidecar process terminated without returning a response.".to_string());
    }

    // Return all lines as a newline-separated string.
    // The frontend splits on newlines and parses each JSON object.
    Ok(output_lines.join("\n"))
}

/// Internal helper: attempt to kill any currently running sidecar process.
fn cancel_investigation_internal(active: &State<'_, ActiveProcess>) {
    let mut guard = active.0.lock().unwrap();
    if let Some(child) = guard.take() {
        let _ = child.kill(); // Graceful kill — reclaim resources immediately
    }
}

/// Internal helper: clear the stored process handle without killing.
fn clear_active_process(active: &State<'_, ActiveProcess>) {
    let mut guard = active.0.lock().unwrap();
    *guard = None;
}

/// Persist an exported report to disk under the user's Documents folder.
///
/// Writes `contents` to `%USERPROFILE%\Documents\ThreatScope Reports\<filename>`
/// (creating the directory if needed) and returns the absolute path so the
/// frontend can confirm the destination to the analyst. Uses only `std::fs`
/// — no additional crate dependencies.
#[tauri::command]
fn export_report_file(contents: String, filename: String) -> Result<String, String> {
    let reports_dir = std::env::var("USERPROFILE")
        .map(|profile| {
            PathBuf::from(profile)
                .join("Documents")
                .join("ThreatScope Reports")
        })
        .map_err(|_| "Could not resolve the user profile directory.".to_string())?;

    std::fs::create_dir_all(&reports_dir)
        .map_err(|e| format!("Failed to create report directory: {}", e))?;

    // Sanitize the filename: keep alphanumerics, dash, underscore, dot.
    let safe_name: String = filename
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect();

    let file_path = reports_dir.join(safe_name);
    std::fs::write(&file_path, contents)
        .map_err(|e| format!("Failed to write report file: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

/// Cancel the current investigation, killing the sidecar process instantly.
///
/// Called by the frontend when the user clicks "Cancel" or starts a new
/// investigation before the previous one completes.
#[tauri::command]
fn cancel_investigation(active: State<'_, ActiveProcess>) -> Result<String, String> {
    cancel_investigation_internal(&active);
    Ok("Investigation cancelled. Sidecar process terminated.".to_string())
}

/// Lightweight ping to verify the sidecar binary is reachable.
#[tauri::command]
async fn ping_sidecar(app: tauri::AppHandle) -> Result<String, String> {
    let sidecar_command = app
        .shell()
        .sidecar("threatscope-engine")
        .map_err(|e| format!("Failed to initialize sidecar command: {}", e))?;

    let (mut rx, mut child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar process: {}", e))?;

    child
        .write(b'{"command":"ping"}\n')
        .map_err(|e| format!("Failed to write to sidecar stdin: {}", e))?;
    child
        .close_stdin()
        .map_err(|e| format!("Failed to close sidecar stdin: {}", e))?;

    while let Some(event) = rx.recv().await {
        if let CommandEvent::Stdout(line_bytes) = event {
            return Ok(String::from_utf8_lossy(&line_bytes).to_string());
        }
    }

    Err("Sidecar process terminated without responding.".to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ActiveProcess::default())
        .invoke_handler(tauri::generate_handler![
            run_investigation,
            ping_sidecar,
            cancel_investigation,
            export_report_file
        ])
        .run(tauri::generate_context!())
        .expect("Error while running ThreatScope desktop application");
}
