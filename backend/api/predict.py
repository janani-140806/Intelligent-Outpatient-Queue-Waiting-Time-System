from fastapi import APIRouter, HTTPException
from backend.schemas.schemas import PredictionRequest, PredictionResponse
from backend.services.ml_service import MLService

router = APIRouter(prefix="/api", tags=["Machine Learning Prediction"])

@router.post("/predict-waiting-time", response_model=PredictionResponse)
def predict_waiting_time_endpoint(req: PredictionRequest):
    """
    Direct ML inference API for OPD Waiting-Time Prediction.
    Accepts patient queue dynamics and outputs predicted waiting time in minutes.
    """
    try:
        result = MLService.predict(
            department=req.department,
            doctor=req.doctor,
            patients_ahead=req.patientsAhead,
            average_consultation_time=req.averageConsultationTime,
            current_queue_length=req.currentQueueLength,
            available_doctors=req.availableDoctors or 1,
            day_of_week=req.dayOfWeek if req.dayOfWeek is not None else 2,
            hour=req.hour if req.hour is not None else 11,
            no_show_rate=req.noShowRate if req.noShowRate is not None else 0.10
        )
        return {
            "predictedWaitingTime": result["predictedWaitingTime"],
            "unit": result.get("unit", "minutes"),
            "modelUsed": result.get("modelUsed"),
            "confidence": result.get("confidence"),
            "note": result.get("note", "Estimated waiting time is for informational purposes only and may change depending on hospital conditions.")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@router.get("/ml/metrics")
def get_ml_metrics():
    """
    Returns comprehensive ML metrics, model comparison benchmarks (Linear Regression vs Random Forest),
    dataset distribution, and architectural pipeline details for final-year project presentation.
    """
    metadata = MLService.get_model_info()
    if not metadata:
        return {
            "status": "not_trained",
            "message": "Model metadata not available. Please run ml/train.py"
        }

    return {
        "status": "active",
        "metadata": metadata,
        "workflow_explanation": [
            {"step": 1, "name": "Feature Input", "desc": "Patient queue position, doctor average time, department, time of day, active doctors, and historical no-show rate."},
            {"step": 2, "name": "Feature Preprocessing", "desc": "StandardScaler for numerical metrics and OneHotEncoder for department/doctor categorical variables via ColumnTransformer."},
            {"step": 3, "name": "Model Regression", "desc": "Ensemble Random Forest Regressor fits non-linear waiting dynamics and accounts for hospital bottlenecks."},
            {"step": 4, "name": "Dynamic Adjustment", "desc": "Queue updates propagate dynamically upon doctor consultation start/complete events."}
        ]
    }
