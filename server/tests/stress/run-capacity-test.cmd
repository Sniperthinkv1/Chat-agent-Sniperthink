@echo off
echo ========================================
echo Server Capacity Test
echo ========================================
echo.
echo This test will:
echo - Send 100 messages/second for 2 seconds (200 total)
echo - Monitor worker processing for 60 seconds
echo - Show queue depth, processing rate, and scaling
echo.
echo Make sure server is running: npm run dev
echo.
pause

node server-capacity-test.js

pause
