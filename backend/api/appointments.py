from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend.models.database_models import Appointment, Patient, User, UserRole, Doctor, Department
from backend.schemas.schemas import AppointmentCreate, AppointmentResponse
from backend.services.auth_service import get_current_user
from backend.services.queue_service import QueueService

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

@router.post("", response_model=AppointmentResponse)
def book_appointment(
    appt_in: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.patient_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user does not have an active patient profile. Only registered patients can book."
        )

    patient_id = current_user.patient_profile.id

    try:
        appt = QueueService.create_appointment_and_queue(
            db=db,
            patient_id=patient_id,
            doctor_id=appt_in.doctor_id,
            department_id=appt_in.department_id,
            appointment_date=appt_in.appointment_date,
            time_slot=appt_in.time_slot,
            symptoms=appt_in.symptoms
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    token_number = appt.queue_item.token_number if appt.queue_item else None
    queue_pos = appt.queue_item.queue_position if appt.queue_item else None
    est_wait = appt.queue_item.estimated_waiting_time if appt.queue_item else None

    return {
        "id": appt.id,
        "appointment_number": appt.appointment_number,
        "patient_id": appt.patient_id,
        "patient_name": current_user.full_name,
        "doctor_id": appt.doctor_id,
        "doctor_name": appt.doctor.user.full_name if appt.doctor and appt.doctor.user else "Dr. Assigned",
        "department_id": appt.department_id,
        "department_name": appt.department.name if appt.department else "General",
        "appointment_date": appt.appointment_date,
        "time_slot": appt.time_slot,
        "status": appt.status,
        "symptoms": appt.symptoms,
        "token_number": token_number,
        "queue_position": queue_pos,
        "estimated_waiting_time": est_wait,
        "created_at": appt.created_at
    }

@router.get("", response_model=List[AppointmentResponse])
def get_appointments(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Appointment)

    if current_user.role == UserRole.PATIENT.value:
        if not current_user.patient_profile:
            return []
        query = query.filter(Appointment.patient_id == current_user.patient_profile.id)
    elif current_user.role == UserRole.DOCTOR.value:
        if not current_user.doctor_profile:
            return []
        query = query.filter(Appointment.doctor_id == current_user.doctor_profile.id)
    # Admin can see all

    if status_filter:
        query = query.filter(Appointment.status == status_filter)

    appointments = query.order_by(Appointment.created_at.desc()).all()

    results = []
    for appt in appointments:
        token_number = appt.queue_item.token_number if appt.queue_item else None
        queue_pos = appt.queue_item.queue_position if appt.queue_item else None
        est_wait = appt.queue_item.estimated_waiting_time if appt.queue_item else None

        results.append({
            "id": appt.id,
            "appointment_number": appt.appointment_number,
            "patient_id": appt.patient_id,
            "patient_name": appt.patient.user.full_name if appt.patient and appt.patient.user else "Patient",
            "doctor_id": appt.doctor_id,
            "doctor_name": appt.doctor.user.full_name if appt.doctor and appt.doctor.user else "Doctor",
            "department_id": appt.department_id,
            "department_name": appt.department.name if appt.department else "Department",
            "appointment_date": appt.appointment_date,
            "time_slot": appt.time_slot,
            "status": appt.status,
            "symptoms": appt.symptoms,
            "token_number": token_number,
            "queue_position": queue_pos,
            "estimated_waiting_time": est_wait,
            "created_at": appt.created_at
        })
    return results

@router.post("/{id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Patient can only cancel their own; Admin can cancel any
    if current_user.role == UserRole.PATIENT.value:
        if not current_user.patient_profile or current_user.patient_profile.id != appt.patient_id:
            raise HTTPException(status_code=403, detail="Not authorized to cancel this appointment.")

    try:
        updated_appt = QueueService.cancel_appointment(db, appt.id, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    token_number = updated_appt.queue_item.token_number if updated_appt.queue_item else None
    return {
        "id": updated_appt.id,
        "appointment_number": updated_appt.appointment_number,
        "patient_id": updated_appt.patient_id,
        "patient_name": updated_appt.patient.user.full_name if updated_appt.patient and updated_appt.patient.user else "Patient",
        "doctor_id": updated_appt.doctor_id,
        "doctor_name": updated_appt.doctor.user.full_name if updated_appt.doctor and updated_appt.doctor.user else "Doctor",
        "department_id": updated_appt.department_id,
        "department_name": updated_appt.department.name if updated_appt.department else "Department",
        "appointment_date": updated_appt.appointment_date,
        "time_slot": updated_appt.time_slot,
        "status": updated_appt.status,
        "symptoms": updated_appt.symptoms,
        "token_number": token_number,
        "queue_position": 0,
        "estimated_waiting_time": 0,
        "created_at": updated_appt.created_at
    }
