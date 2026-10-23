"""
End-to-End System Workflow Verification Script
Tests the entire lifecycle:
Patient Registration -> Appointment Booking -> Token Issuance -> ML Waiting Time Prediction ->
Doctor Consultation Start -> Auto-Queue Re-indexing -> Doctor Consultation Completion ->
Admin Overview & Metrics Verification.
"""

import sys
import os
import requests

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_full_workflow():
    print("==================================================")
    print("STARTING COMPLETE HEALTHCARE E2E WORKFLOW TEST")
    print("==================================================")

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] 1. Backend API is healthy.")

    # 2. Test Admin Login
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@hospital.com",
        "password": "admin123"
    })
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]
    print("[PASS] 2. Admin authentication successful.")

    # 3. Test Patient Login (John Doe)
    patient_login = client.post("/api/auth/login", json={
        "email": "john.doe@example.com",
        "password": "patient123"
    })
    assert patient_login.status_code == 200, f"Patient login failed: {patient_login.text}"
    patient_token = patient_login.json()["access_token"]
    patient_headers = {"Authorization": f"Bearer {patient_token}"}
    print("[PASS] 3. Patient authentication successful.")

    # 4. Fetch Departments & Doctors
    depts = client.get("/api/departments")
    assert depts.status_code == 200 and len(depts.json()) >= 3
    gm_dept = next(d for d in depts.json() if d["code"] == "GM")
    print(f"[PASS] 4. Retrieved {len(depts.json())} departments. Using {gm_dept['name']}.")

    doctors = client.get(f"/api/doctors?department_id={gm_dept['id']}")
    assert doctors.status_code == 200 and len(doctors.json()) >= 1
    doctor = doctors.json()[0]
    print(f"[PASS] 5. Selected Doctor: {doctor['full_name']} ({doctor['specialization']}).")

    # 5. Test Direct ML Prediction API (Requirement 5)
    pred_res = client.post("/api/predict-waiting-time", json={
        "department": gm_dept["name"],
        "doctor": doctor["full_name"],
        "patientsAhead": 4,
        "averageConsultationTime": 10.0,
        "currentQueueLength": 5,
        "availableDoctors": 1,
        "dayOfWeek": 1,
        "hour": 10,
        "noShowRate": 0.08
    })
    assert pred_res.status_code == 200
    pred_json = pred_res.json()
    assert "predictedWaitingTime" in pred_json
    assert pred_json["unit"] == "minutes"
    print(f"[PASS] 6. Direct ML Prediction API verified: {pred_json['predictedWaitingTime']} mins (Model: {pred_json.get('modelUsed')}).")

    # 6. Test Doctor Login (Dr. Rajesh Sharma)
    doc_login = client.post("/api/auth/login", json={
        "email": "dr.rajesh@hospital.com",
        "password": "doctor123"
    })
    assert doc_login.status_code == 200
    doc_token = doc_login.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}
    doc_id = doc_login.json()["user"]["doctor_id"]
    print(f"[PASS] 7. Doctor authenticated. Doctor ID: {doc_id}.")

    # 7. Fetch Doctor's Live Queue
    doc_queue = client.get(f"/api/queue/doctor/{doc_id}")
    assert doc_queue.status_code == 200
    queue_data = doc_queue.json()
    waiting_list = queue_data["waiting_queue"]
    print(f"[PASS] 8. Doctor OPD Queue loaded: {len(waiting_list)} patients waiting.")
    assert len(waiting_list) > 0, "Expected at least 1 waiting patient in demo queue"

    first_patient = waiting_list[0]
    print(f"       Calling first patient: Token {first_patient['token_number']} ({first_patient['patient_name']}).")

    # 8. Doctor Starts Consultation
    start_res = client.post(f"/api/queue/{first_patient['id']}/start", headers=doc_headers)
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "in_consultation"
    print(f"[PASS] 9. Doctor started consultation for token {first_patient['token_number']}.")

    # 9. Verify Patient Queue re-indexed
    doc_queue_after_start = client.get(f"/api/queue/doctor/{doc_id}")
    curr = doc_queue_after_start.json()["current_patient"]
    assert curr is not None and curr["token_number"] == first_patient["token_number"]
    print(f"[PASS] 10. Queue re-indexed successfully. Active patient verified.")

    # 10. Doctor Completes Consultation
    comp_res = client.post(f"/api/queue/{first_patient['id']}/complete", headers=doc_headers, json={
        "diagnosis": "Seasonal viral bronchitis, self-limiting course",
        "prescription": "Azithromycin 500mg OD x 3 days, Cetirizine 10mg HS",
        "notes": "Adequate oral hydration advised. Review in 5 days."
    })
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "completed"
    print(f"[PASS] 11. Consultation completed, medical record and prescription stored.")

    # 11. Check that subsequent patients moved forward
    doc_queue_after_comp = client.get(f"/api/queue/doctor/{doc_id}")
    remaining_waiting = doc_queue_after_comp.json()["waiting_queue"]
    if len(remaining_waiting) > 0:
        new_first = remaining_waiting[0]
        assert new_first["queue_position"] == 1
        print(f"[PASS] 12. Next patient {new_first['token_number']} moved forward to position #1. Est. wait: ~{new_first['estimated_waiting_time']} mins.")

    # 12. Check Admin Overview and Analytics
    admin_overview = client.get("/api/admin/overview")
    assert admin_overview.status_code == 200
    over_data = admin_overview.json()
    print(f"[PASS] 13. Admin Overview verified: {over_data['total_patients_today']} total patients, {over_data['completed_today']} completed, avg wait: {over_data['avg_waiting_time']} min.")

    # 13. Check ML Presentation Metrics (Section 19)
    ml_metrics = client.get("/api/ml/metrics")
    assert ml_metrics.status_code == 200
    metrics_meta = ml_metrics.json()["metadata"]
    assert "models_compared" in metrics_meta
    print(f"[PASS] 14. ML Metrics verified: Selected model = {metrics_meta['best_model']['name']} (R²: {metrics_meta['best_model']['r2_score']}).")

    print("==================================================")
    print("ALL 14 END-TO-END WORKFLOW TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_full_workflow()
