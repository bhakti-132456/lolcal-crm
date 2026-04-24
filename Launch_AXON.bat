@echo off
TITLE AXON CRM Launcher
COLOR 0B

echo ========================================
echo   AXON CRM: Windows Launcher
echo ========================================

:: Ensure we are in the project root
cd /d "%~dp0"

:: Check if the PS1 script exists in bin
if not exist "bin\Launch_AXON.ps1" (
    echo [ERROR] Launch_AXON.ps1 not found in bin directory.
    pause
    exit /b
)

:: Launch the PowerShell script with Bypass policy
echo [SYSTEM] Initializing Stabilized Core...
powershell -NoProfile -ExecutionPolicy Bypass -File "bin\Launch_AXON.ps1"

echo.
echo [SYSTEM] Process finished.
pause

