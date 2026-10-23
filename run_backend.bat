@echo off
echo ====================================================
echo Starting Nani AI Sales Caller Backend (FastAPI)
echo ====================================================
cd /d "%~dp0backend"
if not exist "venv\Scripts\activate.bat" (
    echo Virtual environment not found. Please run: python -m venv venv
    pause
    exit /b 1
)
call venv\Scripts\activate.bat
echo Starting Uvicorn on http://127.0.0.1:8000
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
