@echo off
echo Starting AI Hospital Queue & Waiting-Time Prediction Backend (FastAPI)...
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
