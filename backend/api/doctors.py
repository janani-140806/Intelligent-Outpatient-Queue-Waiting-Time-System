from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend.models.database_models import Doctor, Department, User, UserRole, DoctorStatus
from backend.schemas.schemas import DoctorCreate, DoctorResponse, DoctorUpdate
from backend.services.auth_service import require_role, get_current_user, get_password_hash

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])

@router.get("", response_model=List[DoctorResponse])
def get_doctors(department_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Doctor)
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    doctors = query.all()

    results = []
    for doc in doctors:
        user = doc.user
        dept = doc.department
        results.append({
            "id": doc.id,
            "user_id": doc.user_id,
            "full_name": user.full_name if user else "Dr. Unknown",
            "email": user.email if user else "",
            "department_id": doc.department_id,
            "department_name": dept.name if dept else "General",
            "specialization": doc.specialization,
            "room_number": doc.room_number,
            "status": doc.status,
            "avg_consultation_time": doc.avg_consultation_time,
            "total_patients_served": doc.total_patients_served,
            "phone": user.phone if user else None
        })
    return results

@router.get("/{id}", response_model=DoctorResponse)
def get_doctor(id: int, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    user = doc.user
    dept = doc.department
    return {
        "id": doc.id,
        "user_id": doc.user_id,
        "full_name": user.full_name if user else "Dr. Unknown",
        "email": user.email if user else "",
        "department_id": doc.department_id,
        "department_name": dept.name if dept else "General",
        "specialization": doc.specialization,
        "room_number": doc.room_number,
        "status": doc.status,
        "avg_consultation_time": doc.avg_consultation_time,
        "total_patients_served": doc.total_patients_served,
        "phone": user.phone if user else None
    }

@router.post("", response_model=DoctorResponse)
def create_doctor(
    doc_in: DoctorCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN.value)),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == doc_in.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    dept = db.query(Department).filter(Department.id == doc_in.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    # Create User account
    hashed_pw = get_password_hash(doc_in.password)
    user = User(
        email=doc_in.email.lower(),
        password_hash=hashed_pw,
        role=UserRole.DOCTOR.value,
        full_name=doc_in.full_name,
        phone=doc_in.phone
    )
    db.add(user)
    db.flush()

    doctor = Doctor(
        user_id=user.id,
        department_id=dept.id,
        specialization=doc_in.specialization,
        room_number=doc_in.room_number,
        status=DoctorStatus.AVAILABLE.value,
        avg_consultation_time=doc_in.avg_consultation_time or 12.0,
        total_patients_served=0
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    return {
        "id": doctor.id,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "department_id": dept.id,
        "department_name": dept.name,
        "specialization": doctor.specialization,
        "room_number": doctor.room_number,
        "status": doctor.status,
        "avg_consultation_time": doctor.avg_consultation_time,
        "total_patients_served": doctor.total_patients_served,
        "phone": user.phone
    }

@router.patch("/{id}/status", response_model=DoctorResponse)
def update_doctor_status(
    id: int,
    status_update: DoctorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Doctor).filter(Doctor.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Only admin or the doctor themselves can update
    if current_user.role != UserRole.ADMIN.value and (not current_user.doctor_profile or current_user.doctor_profile.id != doc.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this doctor.")

    if status_update.status:
        doc.status = status_update.status
    if status_update.room_number:
        doc.room_number = status_update.room_number
    if status_update.specialization:
        doc.specialization = status_update.specialization
    if status_update.avg_consultation_time is not None:
        doc.avg_consultation_time = status_update.avg_consultation_time

    db.commit()
    db.refresh(doc)

    return {
        "id": doc.id,
        "user_id": doc.user_id,
        "full_name": doc.user.full_name,
        "email": doc.user.email,
        "department_id": doc.department_id,
        "department_name": doc.department.name,
        "specialization": doc.specialization,
        "room_number": doc.room_number,
        "status": doc.status,
        "avg_consultation_time": doc.avg_consultation_time,
        "total_patients_served": doc.total_patients_served,
        "phone": doc.user.phone
    }
