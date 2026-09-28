@echo off
REM ============================================================================
REM JOY PeopleHR — Biometric Gateway Windows Background Runner
REM Launches the Workforce Gateway Agent continuously in background
REM ============================================================================

title JOY PeopleHR Biometric Gateway Daemon
cd /d "%~dp0\.."

echo ================================================================
echo  JOY PeopleHR — Biometric Hardware Gateway Launcher
echo ================================================================
echo.
echo Starting JOY PeopleHR Production Connector Daemon on port 11108 (REST/ADMS)...
echo Target Cloud Domain: app.joypeoplehr.in
echo.

node scripts/joy-attendance-connector.cjs --prod

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Connector stopped with code %ERRORLEVEL%.
    pause
)
