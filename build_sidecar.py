"""Auto-name and deploy the PyInstaller-built sidecar binary to the Tauri
``src-tauri/binaries/`` directory with platform-aware naming.

Tauri v2 requires sidecar binaries to follow the naming convention:
    ``<bin-name>-<target-triple>[.exe]``

This script detects the host platform and:
  1. Locates the PyInstaller output binary
  2. Renames it to the correct target-triple format
  3. Copies it into ``src-tauri/binaries/``

Usage::

    python build_sidecar.py
"""

import platform
import shutil
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Target triple detection
# ---------------------------------------------------------------------------

def detect_target_triple() -> str:
    """Return the Rust-style target triple for the current platform.

    Covers the three desktop platforms Tauri officially supports:
      * Windows  x86_64  → ``x86_64-pc-windows-msvc``
      * macOS    aarch64 → ``aarch64-apple-darwin``
      * macOS    x86_64  → ``x86_64-apple-darwin``
      * Linux    x86_64  → ``x86_64-unknown-linux-gnu``
    """
    system = platform.system()
    machine = platform.machine().lower()

    if system == "Windows":
        if machine in ("amd64", "x86_64", "x64"):
            return "x86_64-pc-windows-msvc"
        raise OSError(f"Unsupported Windows architecture: {machine}")

    if system == "Darwin":  # macOS
        if machine in ("arm64", "aarch64"):
            return "aarch64-apple-darwin"
        if machine in ("x86_64", "amd64"):
            return "x86_64-apple-darwin"
        raise OSError(f"Unsupported macOS architecture: {machine}")

    if system == "Linux":
        if machine in ("x86_64", "amd64"):
            return "x86_64-unknown-linux-gnu"
        raise OSError(f"Unsupported Linux architecture: {machine}")

    raise OSError(f"Unsupported platform: {system}-{machine}")


def get_binary_extension() -> str:
    """Return the OS-appropriate executable extension."""
    return ".exe" if platform.system() == "Windows" else ""


# ---------------------------------------------------------------------------
# Main deployment logic
# ---------------------------------------------------------------------------

def main():
    bin_name = "emailscope-engine"
    ext = get_binary_extension()
    target_triple = detect_target_triple()

    # Source: PyInstaller --onefile output (binary directly in dist/)
    source_binary = Path("dist") / f"{bin_name}{ext}"
    if not source_binary.exists():
        # Also check --onedir output (dist/<bin_name>/<bin_name>[.exe])
        source_binary = Path("dist") / bin_name / f"{bin_name}{ext}"
    if not source_binary.exists():
        print(f"[ERROR] Built binary not found at: {source_binary}")
        print("        Run PyInstaller first:")
        print(f"        pyinstaller --noconfirm --onefile --windowed --name \"{bin_name}\" sidecar.py")
        sys.exit(1)

    # Target: Tauri binaries directory
    release_name = f"{bin_name}-{target_triple}{ext}"
    binaries_dir = Path("src-tauri") / "binaries"
    target_path = binaries_dir / release_name

    # Ensure the directory exists
    binaries_dir.mkdir(parents=True, exist_ok=True)

    # Copy (not move) so PyInstaller output is preserved for future rebuilds
    shutil.copy2(source_binary, target_path)

    print(f"[OK] Platform detected: {platform.system()} {platform.machine()}")
    print(f"[OK] Target triple:    {target_triple}")
    print(f"[OK] Binary extension: {ext}")
    print(f"[OK] Source:           {source_binary}")
    print(f"[OK] Deployed to:      {target_path}")
    print(f"[OK] File size:        {target_path.stat().st_size / (1024*1024):.1f} MB")
    print()
    print(f"The Tauri sidecar is ready for bundling as: {release_name}")


if __name__ == "__main__":
    main()
