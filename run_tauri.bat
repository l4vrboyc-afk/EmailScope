@echo off
REM Set up MSVC environment
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64

REM Run Tauri dev (Vite server is already running on port 5173)
npm run tauri dev
