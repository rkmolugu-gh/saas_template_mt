@echo off
REM Copyright (c) 2012-2025, EnterpriseDB Corporation.  All rights reserved

REM PostgreSQL server psql runner script for Windows

:MENU
cls
echo ==========================================
echo PostgreSQL Database Management Menu
echo ==========================================
echo 1. Create DB as per backend/.env.example
echo 2. Open psql shell for the DB
echo 3. Generate and run migration
echo 4. Seed database
echo 5. Drop database
echo 6. Exit
echo ==========================================
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto CREATE_DB
if "%choice%"=="2" goto OPEN_PSQL
if "%choice%"=="3" goto MIGRATE
if "%choice%"=="4" goto SEED
if "%choice%"=="5" goto DROP_DB
if "%choice%"=="6" goto EXIT
goto MENU

:CREATE_DB
echo [%date% %time%] Creating database as per backend/.env.example... >> db-task.log
set PGPASSWORD=postgres
REM Check if database exists first
"C:\apps\postgresql16\bin\psql.exe" -h localhost -U postgres -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='saas_template';" | findstr "1" >nul
if %errorlevel% equ 0 (
    echo [%date% %time%] Database 'saas_template' already exists >> db-task.log
    echo Database 'saas_template' already exists
) else (
    "C:\apps\postgresql16\bin\psql.exe" -h localhost -U postgres -d postgres -c "CREATE DATABASE saas_template;" >> db-task.log 2>&1
    if %errorlevel% equ 0 (
        echo [%date% %time%] Database 'saas_template' created successfully >> db-task.log
        echo Database 'saas_template' created successfully
    ) else (
        echo [%date% %time%] Database creation failed >> db-task.log
        echo Database creation failed
    )
)
echo [%date% %time%] Granting privileges to user 'postgres'... >> db-task.log
"C:\apps\postgresql16\bin\psql.exe" -h localhost -U postgres -d saas_template -c "GRANT ALL PRIVILEGES ON DATABASE saas_template TO postgres;" >> db-task.log 2>&1
set PGPASSWORD=
pause
goto MENU

:OPEN_PSQL
echo [%date% %time%] Opening psql shell for saas_template database... >> db-task.log
set PGPASSWORD=postgres
"C:\apps\postgresql16\bin\psql.exe" -h localhost -U postgres -d saas_template -p 5432
set PGPASSWORD=
echo [%date% %time%] Closed psql shell >> db-task.log
pause
goto MENU

:MIGRATE
echo [%date% %time%] Generating and running migration... >> db-task.log
cd /d "%~dp0backend"
if exist "package.json" (
    echo [%date% %time%] Generating TypeORM migration... >> db-task.log
    npm run migration:generate >> ..\db-task.log 2>&1
    if %errorlevel% equ 0 (
        echo [%date% %time%] Migration generated successfully >> db-task.log
        echo Migration generated successfully
    ) else (
        echo [%date% %time%] Migration generation failed, trying to create migration first... >> db-task.log
        npm run migration:create >> ..\db-task.log 2>&1
        if %errorlevel% equ 0 (
            echo [%date% %time%] Migration created successfully, trying to generate... >> db-task.log
            npm run migration:generate >> ..\db-task.log 2>&1
            if %errorlevel% equ 0 (
                echo [%date% %time%] Migration generated successfully >> db-task.log
                echo Migration generated successfully
            ) else (
                echo [%date% %time%] Migration generation failed, proceeding to run existing migrations... >> db-task.log
                echo Migration generation failed, proceeding to run existing migrations...
            )
        ) else (
            echo [%date% %time%] Migration creation failed, proceeding to run existing migrations... >> db-task.log
            echo Migration creation failed, proceeding to run existing migrations...
        )
    )
    echo [%date% %time%] Running TypeORM migration... >> db-task.log
    npm run migration:run >> ..\db-task.log 2>&1
    if %errorlevel% equ 0 (
        echo [%date% %time%] Migration completed successfully >> db-task.log
        echo Migration completed successfully
    ) else (
        echo [%date% %time%] Migration failed, trying alternative commands... >> db-task.log
        npm run typeorm migration:run -d src/data-source.ts >> ..\db-task.log 2>&1
        if %errorlevel% equ 0 (
            echo [%date% %time%] Migration completed successfully with alternative command >> db-task.log
            echo Migration completed successfully with alternative command
        ) else (
            echo [%date% %time%] Migration failed >> db-task.log
            echo Migration failed
        )
    )
) else (
    echo [%date% %time%] Backend package.json not found >> db-task.log
    echo Backend package.json not found
)
cd /d "%~dp0"
pause
goto MENU

:SEED
echo [%date% %time%] Seeding database... >> db-task.log
cd /d "%~dp0backend"
if exist "package.json" (
    echo [%date% %time%] Running TypeORM seeding... >> db-task.log
    npm run seed >> ..\db-task.log 2>&1
    if %errorlevel% equ 0 (
        echo [%date% %time%] Seeding completed successfully >> db-task.log
        echo Seeding completed successfully
    ) else (
        echo [%date% %time%] Seeding failed, trying alternative commands... >> db-task.log
        npm run typeorm:seed >> ..\db-task.log 2>&1
        if %errorlevel% equ 0 (
            echo [%date% %time%] Seeding completed successfully with alternative command >> db-task.log
            echo Seeding completed successfully with alternative command
        ) else (
            echo [%date% %time%] Seeding failed >> db-task.log
            echo Seeding failed
        )
    )
) else (
    echo [%date% %time%] Backend package.json not found >> db-task.log
    echo Backend package.json not found
)
cd /d "%~dp0"
pause
goto MENU

:DROP_DB
echo [%date% %time%] Force dropping database saas_template... >> db-task.log
set PGPASSWORD=postgres
REM Kill active connections first
"C:\apps\postgresql16\bin\psql.exe" -h localhost -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'saas_template';" >> db-task.log 2>&1
REM Drop database with force
"C:\apps\postgresql16\bin\psql.exe" -h localhost -U postgres -d postgres -c "DROP DATABASE IF EXISTS saas_template WITH (FORCE);" >> db-task.log 2>&1
if %errorlevel% equ 0 (
    echo [%date% %time%] Database 'saas_template' dropped successfully >> db-task.log
    echo Database 'saas_template' dropped successfully
) else (
    echo [%date% %time%] Database drop failed, trying alternative method... >> db-task.log
    REM Alternative method for older PostgreSQL versions
    "C:\apps\postgresql16\bin\psql.exe" -h localhost -U postgres -d postgres -c "UPDATE pg_database SET datallowconn = 'false' WHERE datname = 'saas_template';" >> db-task.log 2>&1
    "C:\apps\postgresql16\bin\psql.exe" -h localhost -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'saas_template';" >> db-task.log 2>&1
    "C:\apps\postgresql16\bin\psql.exe" -h localhost -U postgres -d postgres -c "DROP DATABASE IF EXISTS saas_template;" >> db-task.log 2>&1
    if %errorlevel% equ 0 (
        echo [%date% %time%] Database 'saas_template' dropped successfully with alternative method >> db-task.log
        echo Database 'saas_template' dropped successfully with alternative method
    ) else (
        echo [%date% %time%] Database drop failed >> db-task.log
        echo Database drop failed
    )
)
set PGPASSWORD=
pause
goto MENU

:EXIT
echo [%date% %time%] Exiting database management menu >> db-task.log
exit
