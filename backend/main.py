import os
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import Base, engine
from backend.api import auth, departments, doctors, appointments, queue, predict, admin, notifications

# Initialize tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Hospital Queue & Waiting-Time Prediction System",
    description="Full-Stack Healthcare OPD Queue Management and AI-driven Waiting Time Prediction",
    version="1.0.0"
)

# Configure CORS for local development and frontend client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(queue.router)
app.include_router(predict.router)
app.include_router(admin.router)
app.include_router(notifications.router)

@app.get("/")
def root():
    return {
        "project": "AI Hospital Queue & Waiting-Time Prediction System",
        "version": "1.0.0",
        "status": "online",
        "documentation": "/docs",
        "safety_disclaimer": "Estimated waiting time is for informational purposes only and may change depending on hospital conditions."
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
