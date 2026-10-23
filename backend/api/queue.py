from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend.models.database_models import QueueItem, QueueStatus, User, UserRole, Doctor, Appointment
from backend.schemas.schemas import QueueItemResponse, ConsultationComplete
from backend.services.auth_service import get_current_user
from backend.services.queue_service import QueueService

router = APIRouter(prefix="/api/queue", tags=["Queue Management"])

def _format_queue_item(item: QueueItem) -> dict:
    appt = item.appointment
    patient_name = appt.patient.user.full_name if appt and appt.patient and appt.patient.user else "Patient"
    patient_id = appt.patient_id if appt else 0
    doctor_name = item.doctor.user.full_name if item.doctor and item.doctor.user else "Doctor"
    dept_name = item.department.name if item.department else "General"
    room_number = item.doctor.room_number if item.doctor else "TBD"

    return {
        "id": item.id,
        "token_number": item.token_number,
        "appointment_id": item.appointment_id,
        "patient_id": patient_id,
        "patient_name": patient_name,
        "doctor_id": item.doctor_id,
        "doctor_name": doctor_name,
        "department_id": item.department_id,
        "department_name": dept_name,
        "room_number": room_number,
        "queue_position": item.queue_position,
        "status": item.status,
        "estimated_waiting_time": item.estimated_waiting_time,
        "model_confidence": item.model_confidence or 0.95,
        "actual_consultation_start": item.actual_consultation_start,
        "created_at": item.created_at
    }

@router.get("", response_model=List[QueueItemResponse])
def get_all_queue(
    department_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(QueueItem)
    if department_id:
        query = query.filter(QueueItem.department_id == department_id)
    if doctor_id:
        query = query.filter(QueueItem.doctor_id == doctor_id)
    if status_filter:
        query = query.filter(QueueItem.status == status_filter)
    else:
        # Default: active items (waiting & in_consultation)
        query = query.filter(QueueItem.status.in_([QueueStatus.WAITING.value, QueueStatus.IN_CONSULTATION.value]))

    items = query.order_by(
        # in_consultation first, then ascending queue_position
        QueueItem.status.desc(),
        QueueItem.queue_position.asc()
    ).all()

    return [_format_queue_item(it) for it in items]

@router.get("/doctor/{doctor_id}")
def get_doctor_queue(doctor_id: int, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Current consulting patient
    current_patient_item = db.query(QueueItem).filter(
        QueueItem.doctor_id == doctor_id,
        QueueItem.status == QueueStatus.IN_CONSULTATION.value
    ).first()

    # Waiting list
    waiting_items = db.query(QueueItem).filter(
        QueueItem.doctor_id == doctor_id,
        QueueItem.status == QueueStatus.WAITING.value
    ).order_by(QueueItem.queue_position.asc()).all()

    # Completed today
    completed_count = db.query(QueueItem).filter(
        QueueItem.doctor_id == doctor_id,
        QueueItem.status == QueueStatus.COMPLETED.value
    ).count()

    total_est_wait = sum(it.estimated_waiting_time for it in waiting_items)

    return {
        "doctor": {
            "id": doc.id,
            "name": doc.user.full_name,
            "room_number": doc.room_number,
            "status": doc.status,
            "department": doc.department.name
        },
        "current_patient": _format_queue_item(current_patient_item) if current_patient_item else None,
        "waiting_queue": [_format_queue_item(it) for it in waiting_items],
        "waiting_count": len(waiting_items),
        "completed_today": completed_count,
        "estimated_remaining_queue_time": total_est_wait
    }

@router.get("/patient/current")
def get_patient_active_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.patient_profile:
        return {"has_active_token": False, "item": None}

    patient_id = current_user.patient_profile.id

    # Find active appointment (waiting or in_consultation)
    active_appt = db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
        Appointment.status.in_([QueueStatus.WAITING.value, QueueStatus.IN_CONSULTATION.value])
    ).order_by(Appointment.created_at.desc()).first()

    if not active_appt or not active_appt.queue_item:
        return {"has_active_token": False, "item": None}

    item = active_appt.queue_item
    return {
        "has_active_token": True,
        "item": _format_queue_item(item)
    }

@router.post("/{id}/start", response_model=QueueItemResponse)
def start_consultation(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(QueueItem).filter(QueueItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")

    doctor_id = item.doctor_id
    if current_user.role == UserRole.DOCTOR.value and current_user.doctor_profile:
        doctor_id = current_user.doctor_profile.id

    try:
        updated = QueueService.start_consultation(db, item.id, doctor_id)
        return _format_queue_item(updated)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/complete", response_model=QueueItemResponse)
def complete_consultation(
    id: int,
    payload: ConsultationComplete,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(QueueItem).filter(QueueItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")

    doctor_id = item.doctor_id
    if current_user.role == UserRole.DOCTOR.value and current_user.doctor_profile:
        doctor_id = current_user.doctor_profile.id

    try:
        updated = QueueService.complete_consultation(
            db=db,
            queue_item_id=item.id,
            doctor_id=doctor_id,
            diagnosis=payload.diagnosis or "Routine consultation completed",
            prescription=payload.prescription,
            notes=payload.notes,
            duration_minutes=payload.duration_minutes
        )
        return _format_queue_item(updated)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/skip", response_model=QueueItemResponse)
def skip_patient(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(QueueItem).filter(QueueItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")

    doctor_id = item.doctor_id
    if current_user.role == UserRole.DOCTOR.value and current_user.doctor_profile:
        doctor_id = current_user.doctor_profile.id

    try:
        updated = QueueService.skip_patient(db, item.id, doctor_id)
        return _format_queue_item(updated)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
