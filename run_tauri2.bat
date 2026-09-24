@echo on
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64
cd /d "C:\Users\Moses Egbunike\Documents\Claude Code Projects\EmailScope"
npm run tauri dev
echo "EXIT_CODE: %ERRORLEVEL%"
