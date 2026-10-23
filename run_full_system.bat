@echo off
echo =========================================================================
echo Launching Nani AI Sales Caller Platform (Backend + Frontend)
echo =========================================================================

start "Nani Caller Backend" cmd /k "run_backend.bat"
timeout /t 3 /nobreak >nul
start "Nani Caller Frontend" cmd /k "run_frontend.bat"

echo.
echo Both servers launched!
echo Backend Swagger API: http://127.0.0.1:8000/docs
echo Frontend Portal:     http://localhost:5173
echo.
pause
