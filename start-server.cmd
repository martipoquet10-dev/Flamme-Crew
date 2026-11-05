@echo off
rem Double-click to start the Crew server (needs Node.js 20+).
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install --no-fund --no-audit
)
if not exist server\.env copy server\.env.example server\.env >nul
node server\server.mjs
pause
