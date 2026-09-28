@echo off
REM ============================================================================
REM JOY PeopleHR — Production Biometric Connector Launcher v3.5.0
REM Targets Production: https://app.joypeoplehr.in
REM Listens Locally on: http://127.0.0.1:11108 (ADMS Push & Local REST)
REM ============================================================================

title JOY PeopleHR Production Connector Agent
cd /d "%~dp0\.."

echo ================================================================
echo  🌐 JOY PeopleHR — Production Biometric Hardware Connector
echo ================================================================
echo  Cloud Target : https://app.joypeoplehr.in
echo  Local Gateway: http://127.0.0.1:11108
echo  Terminal Mode: ADMS Real-Time Face / Fingerprint Push
echo ================================================================
echo.

node scripts/joy-attendance-connector.cjs --prod

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Connector agent stopped with exit code %ERRORLEVEL%.
    pause
)
