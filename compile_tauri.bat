@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64
cd /d "C:\Users\Moses Egbunike\Documents\Claude Code Projects\EmailScope\src-tauri"
cargo build 2>&1
echo "EXIT_CODE: %ERRORLEVEL%"
