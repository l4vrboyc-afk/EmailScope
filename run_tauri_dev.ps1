# Set up MSVC environment and run Tauri dev
$vsPath = "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat"
$cmdOutput = cmd /c "`"$vsPath`" x64 && set"
foreach ($line in $cmdOutput) {
    if ($line -match "^(.*?)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}
Write-Host "MSVC environment loaded."
npm run tauri dev
