@echo off
title JOY PeopleHR Attendance Connector — Windows Service Installer
echo ============================================================================
echo   JOY PeopleHR Attendance Connector Setup (v3.0.0-enterprise)
echo ============================================================================
echo.

net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] Please right-click this installer and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo [1/4] Creating installation directory in C:\Program Files\JOY PeopleHR\Attendance Connector...
set INSTALL_DIR=C:\Program Files\JOY PeopleHR\Attendance Connector
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo [2/4] Deploying connector daemon and hardware adapters...
copy /Y "%~dp0*" "%INSTALL_DIR%\" >nul 2>&1

echo [3/4] Registering JOY PeopleHR Attendance Connector Windows Service...
sc create "JoyAttendanceConnector" binPath= "\"%INSTALL_DIR%\JoyAttendanceConnector.exe\" --service" start= auto DisplayName= "JOY PeopleHR Attendance Connector" >nul 2>&1
sc description "JoyAttendanceConnector" "Connects customer LAN biometric terminals securely to JOY PeopleHR Cloud." >nul 2>&1

echo [4/4] Starting Windows Service...
sc start "JoyAttendanceConnector" >nul 2>&1

echo.
echo ============================================================================
echo   Installation Successful!
echo   JOY PeopleHR Attendance Connector is now running as a background service.
echo   Return to your JOY PeopleHR web browser to verify pairing status.
echo ============================================================================
echo.
pause
