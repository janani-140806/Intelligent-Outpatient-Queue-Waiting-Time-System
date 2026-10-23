from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.database_models import User, Patient, Doctor, UserRole
from backend.schemas.schemas import UserRegister, UserLogin, TokenResponse, UserResponse
from backend.services.auth_service import verify_password, get_password_hash, create_access_token, get_current_user
import uuid

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Validate role
    role = user_in.role.lower() if user_in.role else UserRole.PATIENT.value
    if role not in [UserRole.PATIENT.value, UserRole.DOCTOR.value, UserRole.ADMIN.value]:
        role = UserRole.PATIENT.value

    hashed_pw = get_password_hash(user_in.password)
    user = User(
        email=user_in.email.lower(),
        password_hash=hashed_pw,
        role=role,
        full_name=user_in.full_name,
        phone=user_in.phone
    )
    db.add(user)
    db.flush()

    patient_id = None
    if role == UserRole.PATIENT.value:
        mrn = f"MRN-{uuid.uuid4().hex[:8].upper()}"
        patient = Patient(
            user_id=user.id,
            medical_record_num=mrn,
            age=user_in.age or 30,
            gender=user_in.gender or "Other",
            blood_group=user_in.blood_group or "O+"
        )
        db.add(patient)
        db.flush()
        patient_id = patient.id

    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "patient_id": patient_id,
            "phone": user.phone
        }
    }

@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email.lower()).first()
    if not user or not verify_password(creds.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    patient_id = user.patient_profile.id if user.patient_profile else None
    doctor_id = user.doctor_profile.id if user.doctor_profile else None

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "phone": user.phone
        }
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    patient_id = current_user.patient_profile.id if current_user.patient_profile else None
    doctor_id = current_user.doctor_profile.id if current_user.doctor_profile else None
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "phone": current_user.phone,
        "patient_id": patient_id,
        "doctor_id": doctor_id
    }
