import sys
import os
from typing import Dict, Any

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from ml.predict import predict_waiting_time as ml_predict_waiting_time, get_metadata

class MLService:
    @staticmethod
    def get_model_info() -> Dict[str, Any]:
        return get_metadata()

    @staticmethod
    def predict(
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
        return ml_predict_waiting_time(
            department=department,
            doctor=doctor,
            patients_ahead=patients_ahead,
            average_consultation_time=average_consultation_time,
            current_queue_length=current_queue_length,
            available_doctors=available_doctors,
            day_of_week=day_of_week,
            hour=hour,
            no_show_rate=no_show_rate
        )
