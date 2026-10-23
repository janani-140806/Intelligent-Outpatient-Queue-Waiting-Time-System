from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from backend.models.database_models import (
    QueueItem, Appointment, Doctor, Department, Patient, Notification,
    Consultation, QueueStatus, AppointmentStatus, DoctorStatus, PredictionLog, User
)
from backend.services.ml_service import MLService

class QueueService:
    @staticmethod
    def generate_token_number(db: Session, department_code: str) -> str:
        today_prefix = f"{department_code}"
        # Count total queue items for this department today
        count = db.query(QueueItem).filter(
            QueueItem.token_number.like(f"{today_prefix}-%")
        ).count()
        return f"{today_prefix}-{count + 1:03d}"

    @staticmethod
    def add_notification(db: Session, user_id: int, title: str, message: str, notif_type: str = "info"):
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notif_type,
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notif)

    @staticmethod
    def calculate_waiting_time_for_queue_item(
        db: Session,
        item: QueueItem,
        doctor: Doctor,
        department: Department,
        patients_ahead: int,
        total_in_queue: int
    ) -> int:
        now = datetime.now()
        day_of_week = now.weekday()
        hour = now.hour

        # Count active/available doctors in this department
        avail_docs = db.query(Doctor).filter(
            Doctor.department_id == department.id,
            Doctor.status.in_([DoctorStatus.AVAILABLE.value, DoctorStatus.BUSY.value])
        ).count()
        avail_docs = max(1, avail_docs)

        doctor_user = db.query(User).filter(User.id == doctor.user_id).first()
        doctor_name = doctor_user.full_name if doctor_user else "Doctor"

        pred = MLService.predict(
            department=department.name,
            doctor=doctor_name,
            patients_ahead=patients_ahead,
            average_consultation_time=doctor.avg_consultation_time,
            current_queue_length=total_in_queue,
            available_doctors=avail_docs,
            day_of_week=day_of_week,
            hour=hour,
            no_show_rate=0.08
        )

        predicted_minutes = pred.get("predictedWaitingTime", 15)

        # Log prediction
        log = PredictionLog(
            token_number=item.token_number,
            department=department.name,
            doctor=doctor_name,
            patients_ahead=patients_ahead,
            current_queue_length=total_in_queue,
            predicted_minutes=predicted_minutes,
            model_used=pred.get("modelUsed", "Random Forest Regressor")
        )
        db.add(log)

        return predicted_minutes

    @staticmethod
    def refresh_doctor_queue(db: Session, doctor_id: int):
        """Recalculates positions and waiting times for all active waiting patients of a doctor."""
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            return

        department = db.query(Department).filter(Department.id == doctor.department_id).first()

        waiting_items: List[QueueItem] = db.query(QueueItem).filter(
            QueueItem.doctor_id == doctor_id,
            QueueItem.status == QueueStatus.WAITING.value
        ).order_by(QueueItem.created_at.asc()).all()

        total_waiting = len(waiting_items)

        for idx, item in enumerate(waiting_items):
            position = idx + 1
            item.queue_position = position
            patients_ahead = idx
            pred_time = QueueService.calculate_waiting_time_for_queue_item(
                db=db,
                item=item,
                doctor=doctor,
                department=department,
                patients_ahead=patients_ahead,
                total_in_queue=total_waiting
            )
            item.estimated_waiting_time = pred_time

            # If approaching (e.g. 1st or 2nd), send alert notification
            if position == 1:
                appointment = db.query(Appointment).filter(Appointment.id == item.appointment_id).first()
                if appointment and appointment.patient:
                    patient_user = db.query(User).filter(User.id == appointment.patient.user_id).first()
                    if patient_user:
                        QueueService.add_notification(
                            db=db,
                            user_id=patient_user.id,
                            title="You are Next in Queue!",
                            message=f"Token {item.token_number}: You are next to see Dr. {doctor.user.full_name} in Room {doctor.room_number}. Please be near the consultation door.",
                            notif_type="approaching"
                        )
        db.commit()

    @staticmethod
    def create_appointment_and_queue(
        db: Session,
        patient_id: int,
        doctor_id: int,
        department_id: int,
        appointment_date: str,
        time_slot: str,
        symptoms: Optional[str] = None
    ) -> Appointment:
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        department = db.query(Department).filter(Department.id == department_id).first()
        patient = db.query(Patient).filter(Patient.id == patient_id).first()

        if not doctor or not department or not patient:
            raise ValueError("Doctor, Department, or Patient not found")

        # Generate appointment number
        appt_count = db.query(Appointment).count()
        appt_num = f"APT-{datetime.utcnow().strftime('%Y%m%d')}-{appt_count + 1:04d}"

        # Generate token
        token_num = QueueService.generate_token_number(db, department.code)

        # Count waiting patients ahead for this doctor
        waiting_count = db.query(QueueItem).filter(
            QueueItem.doctor_id == doctor_id,
            QueueItem.status == QueueStatus.WAITING.value
        ).count()
        queue_pos = waiting_count + 1

        appointment = Appointment(
            appointment_number=appt_num,
            patient_id=patient_id,
            doctor_id=doctor_id,
            department_id=department_id,
            appointment_date=appointment_date,
            time_slot=time_slot,
            status=AppointmentStatus.WAITING.value,
            symptoms=symptoms
        )
        db.add(appointment)
        db.flush()

        queue_item = QueueItem(
            token_number=token_num,
            appointment_id=appointment.id,
            doctor_id=doctor_id,
            department_id=department_id,
            queue_position=queue_pos,
            status=QueueStatus.WAITING.value,
            estimated_waiting_time=15
        )
        db.add(queue_item)
        db.flush()

        # ML estimate
        pred_time = QueueService.calculate_waiting_time_for_queue_item(
            db=db,
            item=queue_item,
            doctor=doctor,
            department=department,
            patients_ahead=waiting_count,
            total_in_queue=queue_pos
        )
        queue_item.estimated_waiting_time = pred_time

        # Send notification to patient
        QueueService.add_notification(
            db=db,
            user_id=patient.user_id,
            title="Appointment & Token Confirmed",
            message=f"Appointment {appt_num} booked with Dr. {doctor.user.full_name}. Your Token is {token_num} (Queue #{queue_pos}). Est. wait time: ~{pred_time} mins.",
            notif_type="token"
        )

        db.commit()
        db.refresh(appointment)
        return appointment

    @staticmethod
    def start_consultation(db: Session, queue_item_id: int, doctor_id: int) -> QueueItem:
        item = db.query(QueueItem).filter(QueueItem.id == queue_item_id).first()
        if not item:
            raise ValueError("Queue item not found")

        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            raise ValueError("Doctor not found")

        item.status = QueueStatus.IN_CONSULTATION.value
        item.actual_consultation_start = datetime.utcnow()
        item.estimated_waiting_time = 0

        # Update appointment status
        if item.appointment:
            item.appointment.status = AppointmentStatus.IN_CONSULTATION.value

        doctor.status = DoctorStatus.BUSY.value
        db.commit()

        # Notify patient
        if item.appointment and item.appointment.patient:
            QueueService.add_notification(
                db=db,
                user_id=item.appointment.patient.user_id,
                title="Consultation Started",
                message=f"Your consultation with Dr. {doctor.user.full_name} has commenced in Room {doctor.room_number}.",
                notif_type="consultation"
            )

        # Refresh remaining queue
        QueueService.refresh_doctor_queue(db, doctor_id)
        db.refresh(item)
        return item

    @staticmethod
    def complete_consultation(
        db: Session,
        queue_item_id: int,
        doctor_id: int,
        diagnosis: str,
        prescription: Optional[str] = None,
        notes: Optional[str] = None,
        duration_minutes: Optional[float] = None
    ) -> QueueItem:
        item = db.query(QueueItem).filter(QueueItem.id == queue_item_id).first()
        if not item:
            raise ValueError("Queue item not found")

        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            raise ValueError("Doctor not found")

        now = datetime.utcnow()
        item.status = QueueStatus.COMPLETED.value
        item.actual_consultation_end = now
        item.queue_position = 0
        item.estimated_waiting_time = 0

        if item.appointment:
            item.appointment.status = AppointmentStatus.COMPLETED.value

        # Calculate duration
        if duration_minutes is None:
            if item.actual_consultation_start:
                duration_minutes = max(3.0, round((now - item.actual_consultation_start).total_seconds() / 60.0, 1))
            else:
                duration_minutes = doctor.avg_consultation_time

        # Create consultation record
        consultation = Consultation(
            queue_item_id=item.id,
            doctor_id=doctor.id,
            patient_id=item.appointment.patient_id,
            duration_minutes=duration_minutes,
            diagnosis=diagnosis,
            prescription=prescription,
            notes=notes,
            completed_at=now
        )
        db.add(consultation)

        doctor.total_patients_served += 1
        doctor.status = DoctorStatus.AVAILABLE.value
        db.commit()

        # Notify patient
        if item.appointment and item.appointment.patient:
            QueueService.add_notification(
                db=db,
                user_id=item.appointment.patient.user_id,
                title="Consultation Completed",
                message=f"Your visit with Dr. {doctor.user.full_name} is marked complete. Prescriptions/diagnosis recorded.",
                notif_type="completed"
            )

        # Re-index remaining queue for this doctor
        QueueService.refresh_doctor_queue(db, doctor_id)
        db.refresh(item)
        return item

    @staticmethod
    def skip_patient(db: Session, queue_item_id: int, doctor_id: int) -> QueueItem:
        item = db.query(QueueItem).filter(QueueItem.id == queue_item_id).first()
        if not item:
            raise ValueError("Queue item not found")

        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        item.status = QueueStatus.SKIPPED.value
        if item.appointment:
            item.appointment.status = AppointmentStatus.NO_SHOW.value

        db.commit()

        if item.appointment and item.appointment.patient:
            QueueService.add_notification(
                db=db,
                user_id=item.appointment.patient.user_id,
                title="Queue Number Skipped (No-Show)",
                message=f"Token {item.token_number} was skipped because you were not present. Please approach the hospital reception desk to be re-queued.",
                notif_type="warning"
            )

        QueueService.refresh_doctor_queue(db, doctor_id)
        db.refresh(item)
        return item

    @staticmethod
    def cancel_appointment(db: Session, appointment_id: int, user_id: int) -> Appointment:
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise ValueError("Appointment not found")

        appointment.status = AppointmentStatus.CANCELLED.value
        if appointment.queue_item:
            appointment.queue_item.status = QueueStatus.CANCELLED.value

        doctor_id = appointment.doctor_id
        db.commit()

        QueueService.add_notification(
            db=db,
            user_id=user_id,
            title="Appointment Cancelled",
            message=f"Appointment {appointment.appointment_number} has been cancelled successfully.",
            notif_type="cancelled"
        )

        QueueService.refresh_doctor_queue(db, doctor_id)
        db.refresh(appointment)
        return appointment
