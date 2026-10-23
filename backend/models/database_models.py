import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship
from backend.database import Base

class UserRole(str, enum.Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"

class DoctorStatus(str, enum.Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    ON_BREAK = "on_break"
    OFFLINE = "offline"

class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    WAITING = "waiting"
    IN_CONSULTATION = "in_consultation"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class QueueStatus(str, enum.Enum):
    WAITING = "waiting"
    IN_CONSULTATION = "in_consultation"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.PATIENT.value, nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient_profile = relationship("Patient", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(10), unique=True, nullable=False)  # e.g., "GM", "CD", "PD"
    description = Column(Text, nullable=True)
    base_consultation_time = Column(Float, default=12.0)
    is_active = Column(Boolean, default=True)

    doctors = relationship("Doctor", back_populates="department")
    appointments = relationship("Appointment", back_populates="department")
    queue_items = relationship("QueueItem", back_populates="department")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    specialization = Column(String(150), nullable=False)
    room_number = Column(String(50), nullable=False)
    status = Column(String(50), default=DoctorStatus.AVAILABLE.value)
    avg_consultation_time = Column(Float, default=12.0)
    total_patients_served = Column(Integer, default=0)

    user = relationship("User", back_populates="doctor_profile")
    department = relationship("Department", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor")
    queue_items = relationship("QueueItem", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    medical_record_num = Column(String(50), unique=True, nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    blood_group = Column(String(10), nullable=True)

    user = relationship("User", back_populates="patient_profile")
    appointments = relationship("Appointment", back_populates="patient")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    appointment_number = Column(String(50), unique=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    appointment_date = Column(String(50), nullable=False)  # YYYY-MM-DD
    time_slot = Column(String(50), nullable=False)        # e.g., "10:00 AM - 10:30 AM"
    status = Column(String(50), default=AppointmentStatus.WAITING.value)
    symptoms = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    department = relationship("Department", back_populates="appointments")
    queue_item = relationship("QueueItem", back_populates="appointment", uselist=False, cascade="all, delete-orphan")

class QueueItem(Base):
    __tablename__ = "queue_items"

    id = Column(Integer, primary_key=True, index=True)
    token_number = Column(String(20), unique=True, nullable=False)  # e.g., "GM-023"
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    queue_position = Column(Integer, default=1)
    status = Column(String(50), default=QueueStatus.WAITING.value)
    estimated_waiting_time = Column(Integer, default=15)  # minutes
    model_confidence = Column(Float, default=0.95)
    actual_wait_start = Column(DateTime, default=datetime.utcnow)
    actual_consultation_start = Column(DateTime, nullable=True)
    actual_consultation_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    appointment = relationship("Appointment", back_populates="queue_item")
    doctor = relationship("Doctor", back_populates="queue_items")
    department = relationship("Department", back_populates="queue_items")
    consultation = relationship("Consultation", back_populates="queue_item", uselist=False)

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    queue_item_id = Column(Integer, ForeignKey("queue_items.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    duration_minutes = Column(Float, default=10.0)
    diagnosis = Column(Text, nullable=True)
    prescription = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, default=datetime.utcnow)

    queue_item = relationship("QueueItem", back_populates="consultation")

class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True)
    token_number = Column(String(50), nullable=True)
    department = Column(String(100), nullable=False)
    doctor = Column(String(150), nullable=False)
    patients_ahead = Column(Integer, nullable=False)
    current_queue_length = Column(Integer, nullable=False)
    predicted_minutes = Column(Integer, nullable=False)
    model_used = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")  # token, approaching, completed, cancelled, info
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")
