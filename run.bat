@echo off
SET PATH=C:\apps\nodejs18;%PATH%
echo Starting SaaS Template...

start "Backend API" cmd /c "cd middleware && npm run dev"
start "Frontend UI" cmd /c "cd frontend && npm run dev"

echo Services started in new windows.
echo Middleware: http://localhost:3001
echo Frontend: http://localhost:5173
pause
