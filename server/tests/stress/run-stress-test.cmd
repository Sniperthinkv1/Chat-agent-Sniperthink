@echo off
echo Starting WebChat Stress Test...
echo.
echo Make sure:
echo 1. Server is running (npm run dev)
echo 2. Workers are running (npm run workers:all)
echo 3. Database is accessible
echo.
pause

cd /d "%~dp0..\.."
node tests/stress/webchat-stress-test.js
