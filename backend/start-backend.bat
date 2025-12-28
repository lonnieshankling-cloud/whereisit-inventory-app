@echo off
cd /d "%~dp0"
echo Starting Encore backend on port 4002...
encore run --port 4002
pause
