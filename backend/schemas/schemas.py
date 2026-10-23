from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    phone: Optional[str] = None
    role: Optional[str] = "patient"
    # Patient specific fields (if patient)
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    patient_id: Optional[int] = None
    doctor_id: Optional[int] = None

# --- Department Schemas ---
class DepartmentCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    base_consultation_time: Optional[float] = 12.0

class DepartmentResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    base_consultation_time: float
    is_active: bool
    doctor_count: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Doctor Schemas ---
class DoctorCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    department_id: int
    specialization: str
    room_number: str
    avg_consultation_time: Optional[float] = 12.0
    phone: Optional[str] = None

class DoctorUpdate(BaseModel):
    specialization: Optional[str] = None
    room_number: Optional[str] = None
    status: Optional[str] = None
    avg_consultation_time: Optional[float] = None

class DoctorResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    department_id: int
    department_name: str
    specialization: str
    room_number: str
    status: str
    avg_consultation_time: float
    total_patients_served: int
    phone: Optional[str] = None

    class Config:
        from_attributes = True

# --- Appointment & Queue Schemas ---
class AppointmentCreate(BaseModel):
    doctor_id: int
    department_id: int
    appointment_date: str # YYYY-MM-DD
    time_slot: str
    symptoms: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: int
    appointment_number: str
    patient_id: int
    patient_name: str
    doctor_id: int
    doctor_name: str
    department_id: int
    department_name: str
    appointment_date: str
    time_slot: str
    status: str
    symptoms: Optional[str] = None
    token_number: Optional[str] = None
    queue_position: Optional[int] = None
    estimated_waiting_time: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class QueueItemResponse(BaseModel):
    id: int
    token_number: str
    appointment_id: int
    patient_id: int
    patient_name: str
    doctor_id: int
    doctor_name: str
    department_id: int
    department_name: str
    room_number: str
    queue_position: int
    status: str
    estimated_waiting_time: int
    model_confidence: float
    actual_consultation_start: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ConsultationComplete(BaseModel):
    diagnosis: Optional[str] = "Routine consultation completed"
    prescription: Optional[str] = None
    notes: Optional[str] = None
    duration_minutes: Optional[float] = None

# --- Prediction Schemas ---
class PredictionRequest(BaseModel):
    department: str
    doctor: str
    patientsAhead: int
    averageConsultationTime: float
    currentQueueLength: int
    availableDoctors: Optional[int] = 1
    dayOfWeek: Optional[int] = 2
    hour: Optional[int] = 11
    noShowRate: Optional[float] = 0.10

class PredictionResponse(BaseModel):
    predictedWaitingTime: int
    unit: str = "minutes"
    modelUsed: Optional[str] = None
    confidence: Optional[float] = None
    note: Optional[str] = "Estimated waiting time is for informational purposes only and may change depending on hospital conditions."

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Dashboard Stats Schemas ---
class DashboardOverview(BaseModel):
    total_patients_today: int
    waiting_patients: int
    consulting_patients: int
    completed_today: int
    no_shows_today: int
    available_doctors: int
    total_doctors: int
    avg_waiting_time: float
    max_waiting_time: int
    departments_count: int
    safety_disclaimer: str = "Estimated waiting time is for informational purposes only and may change depending on hospital conditions."
