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
echo Starting Biometric Gateway Daemon on ports 11108 (REST) and 8080 (ADMS)...
echo.

node scripts/workforce-gateway-agent.cjs

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Gateway crashed or stopped with code %ERRORLEVEL%.
    pause
)
