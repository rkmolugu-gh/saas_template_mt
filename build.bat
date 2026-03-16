@echo off
SET PATH=C:\apps\nodejs18;%PATH%
echo Building SaaS Template...

echo [1/3] Installing and building Backend...
cd backend
call npm install
call npm run build
if %ERRORLEVEL% NEQ 0 goto error
cd ..

echo [2/3] Installing and building Middleware...
cd middleware
call npm install
call npm run build
if %ERRORLEVEL% NEQ 0 goto error
cd ..

echo [3/3] Installing and building Frontend...
cd frontend
call npm install
call npm run build
if %ERRORLEVEL% NEQ 0 goto error
cd ..

echo Build successful!
pause
exit /b 0

:error
echo Build failed!
pause
exit /b 1
