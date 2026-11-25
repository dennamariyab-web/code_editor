@echo off
title NovaCode - Beginner-Friendly Smart Code Editor
cls

echo ========================================================
echo   NovaCode - Beginner-Friendly Smart Code Editor
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found on your system PATH!
    pause
    exit /b 1
)

echo Starting NovaCode backend server...
start /B node server/index.js > novacode.log 2>&1
timeout /t 2 /nobreak >nul

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://127.0.0.1:3840
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:3840
) else (
    start http://127.0.0.1:3840
)

echo NovaCode is running at http://127.0.0.1:3840
echo Press any key to stop.
pause >nul

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3840') do (
    taskkill /F /PID %%a >nul 2>&1
)
