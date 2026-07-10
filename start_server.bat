@echo off
title AURA // AI-Native CRM Localhost Server (Port 3000)
echo ================================================================================
echo AURA // AI-NATIVE CRM REPLY-INTENT BACKEND SERVICE
echo ================================================================================
echo Applying PostgreSQL migrations and starting AURA CRM on http://localhost:3000
echo.
call npm run migrate
if errorlevel 1 exit /b 1
call npm run seed
if errorlevel 1 exit /b 1
node server.js
pause
