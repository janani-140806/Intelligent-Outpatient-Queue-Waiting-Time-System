"""
Hospital Waiting-Time Inference Module
Loads serialized ML pipeline to make predictions. Provides fallback heuristic if model is not loaded.
"""

import os
import json
import joblib
import pandas as pd
from typing import Dict, Any

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "best_model.joblib")
METADATA_PATH = os.path.join(BASE_DIR, "model", "model_metadata.json")

_model = None
_metadata = None

def get_metadata() -> Dict[str, Any]:
    global _metadata
    if _metadata is None:
        if os.path.exists(METADATA_PATH):
            try:
                with open(METADATA_PATH, "r") as f:
                    _metadata = json.load(f)
            except Exception:
                _metadata = {}
        else:
            _metadata = {}
    return _metadata

def get_model():
    global _model
    if _model is None:
        if os.path.exists(MODEL_PATH):
            try:
                _model = joblib.load(MODEL_PATH)
            except Exception as e:
                print(f"Error loading model from {MODEL_PATH}: {e}")
                _model = None
    return _model

def heuristic_estimate(
    patients_ahead: int,
    avg_consultation_time: float,
    available_doctors: int = 1,
    no_show_rate: float = 0.10,
    hour: int = 10,
    day_of_week: int = 2
) -> float:
    """Fallback calculation if ML model file is not yet available"""
    doctors = max(1, available_doctors)
    effective_ahead = max(0, patients_ahead) * (1.0 - no_show_rate * 0.7)
    base = (effective_ahead * avg_consultation_time) / doctors
    multiplier = 1.15 if (10 <= hour <= 13) else 1.0
    day_mult = 1.1 if day_of_week == 0 else 1.0
    return max(2.0, round(base * multiplier * day_mult, 1))

def predict_waiting_time(
    department: str,
    doctor: str,
    patients_ahead: int,
    average_consultation_time: float,
    current_queue_length: int,
    available_doctors: int = 1,
    day_of_week: int = 2,
    hour: int = 11,
    no_show_rate: float = 0.10
) -> Dict[str, Any]:
    model = get_model()
    metadata = get_metadata()
    model_name = metadata.get("best_model", {}).get("name", "Random Forest Regressor")

    if patients_ahead <= 0:
        return {
            "predictedWaitingTime": 0,
            "unit": "minutes",
            "modelUsed": "Zero Queue Rule",
            "confidence": 1.0,
            "note": "You are currently next or in consultation."
        }

    if model is not None:
        try:
            input_df = pd.DataFrame([{
                "department": department,
                "doctor": doctor,
                "patientsAhead": int(patients_ahead),
                "averageConsultationTime": float(average_consultation_time),
                "currentQueueLength": int(current_queue_length),
                "availableDoctors": max(1, int(available_doctors)),
                "dayOfWeek": int(day_of_week),
                "hour": int(hour),
                "noShowRate": float(no_show_rate)
            }])
            raw_pred = float(model.predict(input_df)[0])
            pred_minutes = max(1, int(round(raw_pred)))
            return {
                "predictedWaitingTime": pred_minutes,
                "unit": "minutes",
                "modelUsed": model_name,
                "confidence": round(metadata.get("best_model", {}).get("r2_score", 0.94), 2),
                "note": "Estimated waiting time is for informational purposes only and may change depending on hospital conditions."
            }
        except Exception as err:
            print(f"ML inference error: {err}. Using fallback heuristic.")

    fallback_val = int(round(heuristic_estimate(
        patients_ahead=patients_ahead,
        avg_consultation_time=average_consultation_time,
        available_doctors=available_doctors,
        no_show_rate=no_show_rate,
        hour=hour,
        day_of_week=day_of_week
    )))
    return {
        "predictedWaitingTime": max(1, fallback_val),
        "unit": "minutes",
        "modelUsed": "Deterministic Healthcare Heuristic (Fallback)",
        "confidence": 0.85,
        "note": "Estimated waiting time is for informational purposes only and may change depending on hospital conditions."
    }

if __name__ == "__main__":
    result = predict_waiting_time(
        department="General Medicine",
        doctor="Dr. Rajesh Sharma",
        patients_ahead=5,
        average_consultation_time=10.0,
        current_queue_length=6,
        available_doctors=1
    )
    print("Test Prediction Output:", result)
