from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models.database_models import Department, Doctor, UserRole, User
from backend.schemas.schemas import DepartmentCreate, DepartmentResponse
from backend.services.auth_service import require_role

router = APIRouter(prefix="/api/departments", tags=["Departments"])

@router.get("", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).filter(Department.is_active == True).all()
    results = []
    for d in departments:
        doc_count = db.query(Doctor).filter(Doctor.department_id == d.id).count()
        results.append({
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "description": d.description,
            "base_consultation_time": d.base_consultation_time,
            "is_active": d.is_active,
            "doctor_count": doc_count
        })
    return results

@router.post("", response_model=DepartmentResponse)
def create_department(
    dep_in: DepartmentCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN.value)),
    db: Session = Depends(get_db)
):
    existing = db.query(Department).filter(Department.code == dep_in.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department with this code already exists.")

    dep = Department(
        name=dep_in.name,
        code=dep_in.code.upper(),
        description=dep_in.description,
        base_consultation_time=dep_in.base_consultation_time or 12.0,
        is_active=True
    )
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return {
        "id": dep.id,
        "name": dep.name,
        "code": dep.code,
        "description": dep.description,
        "base_consultation_time": dep.base_consultation_time,
        "is_active": dep.is_active,
        "doctor_count": 0
    }
