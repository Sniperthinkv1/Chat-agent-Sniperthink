@echo off
echo ========================================
echo WebChat Stress Test - Complete Runner
echo ========================================
echo.

REM Change to server directory
cd /d "%~dp0..\.."

echo Step 1: Setup test user with credits
echo --------------------------------------
node tests/stress/setup-test-user.js
if errorlevel 1 (
    echo.
    echo ❌ User setup failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Pre-flight checks
echo --------------------------------------
node tests/stress/check-readiness.js
if errorlevel 1 (
    echo.
    echo ❌ System is not ready!
    echo Please fix the issues above.
    pause
    exit /b 1
)

echo.
echo Step 3: Run stress test
echo --------------------------------------
echo.
echo Test will create:
echo   - 10 agents for user_test_webchat
echo   - 50 new sessions per second
echo   - Run for 30 seconds (~1500 sessions)
echo.
echo Make sure workers are running!
echo.
pause

node tests/stress/webchat-stress-test.js

echo.
echo ========================================
echo Test Complete!
echo ========================================
echo.
echo Check the results file in tests/stress/
echo.
pause
