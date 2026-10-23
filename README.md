# AI Hospital Queue & Waiting-Time Prediction System
### Complete Final-Year CSE Healthcare Capstone Software Project

[![Python Version](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.13-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115-teal.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-sky.svg)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38bdf8.svg)](https://tailwindcss.com)
[![Scikit-Learn](https://img.shields.io/badge/Machine%20Learning-Scikit--Learn%201.8-orange.svg)](https://scikit-learn.org)
[![Status](https://img.shields.io/badge/Project%20Status-Complete%20%26%20Tested-emerald.svg)]()

---

## 1. Problem Statement & Project Goal

Outpatient departments (OPD) in hospitals frequently suffer from unpredictable queues, crowded waiting lobbies, lack of transparency, and patient anxiety regarding wait durations. Traditional static queue ticketing systems merely assign sequential numbers without calculating dynamic waiting times based on real clinician pace, no-shows, triage delays, and clinic workload.

The **AI Hospital Queue & Waiting-Time Prediction System** is a full-stack web application designed for outpatient clinics and multi-specialty hospitals. It manages real-time patient queues and uses a trained **Random Forest Regressor** to predict estimated waiting times for every patient.

---

## 2. Key Features & Role-Based Access Control

### 🧑‍⚕️ Patient Portal
* **Registration & Secure Authentication:** Registration with age, gender, and blood group.
* **OPD Token Booking:** Select department, choose doctor, select date and time slot, and specify symptoms.
* **Live Digital Token (e.g. `GM-005`):** Displays queue position (e.g. `#5`), estimated waiting time (e.g. `~48 mins`), assigned doctor, and room number.
* **Visual Queue Progress Stepper:** Dynamic 5-stage progress indicator:
  `Token Issued` ➔ `In Queue` ➔ `Up Next` ➔ `Consulting` ➔ `Completed`.
* **Appointment History & Self-Cancellation:** Manage and cancel scheduled visits.
* **In-App Notification Center:** Alerts for token generation, queue approaching, and consultation commencement.

### 🩺 Doctor OPD Workbench
* **Clinician Authentication & Status Management:** Toggle availability (`Available`, `On Break`).
* **Active Patient Consultation Suite:** Real-time view of patient currently in consultation with start timer.
* **One-Click Queue Advancement:**
  * **Start Consultation:** Moves patient into room, alerts patient, and re-indexes the queue.
  * **Complete Consultation:** Records diagnosis, medications, follow-up advice, and finalizes queue.
  * **Skip Patient (No-Show):** Flags missed turns and re-indexes remaining waiting patients.
* **Upcoming Queue & Workload Prediction:** Displays upcoming patients and cumulative remaining queue time.

### 🏥 Hospital Administration & Analytics
* **Executive OPD Dashboard:** Real-time metrics on total patients today, waiting count, active examinations, completed visits, no-shows, and available doctors.
* **Interactive Healthcare Analytics (Recharts):**
  * Hourly patient influx and wait-time distribution (OPD rush hour curve).
  * Weekly queue volume and average wait trend.
  * Department-wise patient breakdown pie chart.
  * Clinician workload and throughput metrics.
* **Clinical Roster & Department Management:** Add new hospital departments and onboard clinicians.
* **Comprehensive Queue Registry:** Live table of all hospital tokens across all specialties.

### 🧠 Dedicated AI Presentation Hub (Final-Year Project Feature)
* **Model Comparison Benchmark:** Side-by-side evaluation of **Linear Regression** vs. **Random Forest Regressor** with **MAE**, **RMSE**, and **R² score**.
* **Feature Importance Chart:** Visual breakdown of top predictive factors (`patientsAhead`, `averageConsultationTime`, `currentQueueLength`, `availableDoctors`, `hour`, `noShowRate`).
* **Live API Prediction Sandbox:** Interactive control panel allowing examiners to input custom queue parameters and execute direct inferences against `POST /api/predict-waiting-time` with JSON output display.
* **Workflow Explanation:** Visual architecture pipeline illustrating `Input ➔ Preprocessor ➔ ML Model ➔ Dynamic Queue Adjustment`.

---

## 3. Technology Stack

| Layer | Technologies Used | Rationale |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Recharts | Fast, modern, responsive healthcare UI with interactive charts |
| **Backend** | Python 3, FastAPI, Uvicorn, Pydantic v2 | High performance, async REST API, auto OpenAPI/Swagger docs |
| **Database** | SQLite, SQLAlchemy 2.0 ORM | Zero-configuration local relational database with proper foreign keys |
| **Authentication** | JWT (JSON Web Tokens), Passlib (Bcrypt) | Stateless, role-based access control (`patient`, `doctor`, `admin`) |
| **Machine Learning** | Scikit-learn, Pandas, NumPy, Joblib | Benchmark regression models, preprocessing pipeline, persistence |

---

## 4. Machine Learning Methodology & Benchmark Results

### Feature Engineering
The model predicts `waitingTimeMinutes` using 9 operational features:
1. `patientsAhead` (Integer): Number of active waiting patients ahead of the current token.
2. `averageConsultationTime` (Float): Historical or baseline doctor consultation pace in minutes.
3. `currentQueueLength` (Integer): Total patients registered in that department's queue.
4. `availableDoctors` (Integer): Number of clinicians actively seeing patients in the department.
5. `dayOfWeek` (Integer, 0–6): Captures Monday rush and weekend volume shifts.
6. `hour` (Integer, 8–17): Captures OPD rush hours (e.g. 10:00 AM – 1:00 PM).
7. `noShowRate` (Float, 0.04–0.20): Historical proportion of skipped/no-show patients.
8. `department` (Categorical One-Hot Encoded): Medical specialty context.
9. `doctor` (Categorical One-Hot Encoded): Clinician-specific consultation variance.

### Preprocessing Pipeline
* **Numerical Features:** Normalized using `StandardScaler`.
* **Categorical Features:** Transformed using `OneHotEncoder(handle_unknown="ignore")`.
* Combined into a unified `ColumnTransformer` and serialized with the estimator in a single `Pipeline`.

### Model Evaluation Benchmark (80/20 Train-Test Split on 3,500 Samples)

| Evaluation Metric | Linear Regression (Baseline) | Random Forest Regressor (Selected ★) |
|---|---|---|
| **Mean Absolute Error (MAE)** | 26.30 minutes | **8.37 minutes** |
| **Root Mean Squared Error (RMSE)** | 37.09 minutes | **13.26 minutes** |
| **Coefficient of Determination ($R^2$)** | 0.8092 | **0.9756** |
| **Architecture** | Ordinary Least Squares | 120 Estimators, Max Depth 14 |

> **Conclusion:** Random Forest Regressor significantly outperformed Linear Regression, reducing MAE by ~18 minutes and achieving an $R^2$ of **0.9756** due to its ability to model non-linear emergency delays and compounding hospital rush factors.

---

## 5. System Architecture & Queue Workflow

```
[ Patient App / Browser ] ─── HTTP / REST ───> [ FastAPI Gateway ]
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
           [ Queue & Consultation Logic ]                                [ ML Inference Service ]
           • Token generation (e.g. GM-005)                              • Pipeline: StandardScaler + OneHot
           • Re-indexing on start/complete                               • Random Forest Regressor
           • In-app notifications                                        • model_metadata.json
                       │                                                             │
                       ▼                                                             ▼
           [ SQLite Relational DB ]                                      [ Scikit-Learn Model ]
           • users, patients, doctors                                    • best_model.joblib
           • departments, appointments                                   (MAE: 8.37m, R²: 0.9756)
           • queue_items, consultations
```

### Complete Lifecycle Workflow:
```
Patient registers & logs in
   ➔ Selects Department & Doctor
   ➔ Books Appointment
   ➔ System issues Queue Token (e.g. GM-005)
   ➔ Patient enters Waiting Queue (Position #5)
   ➔ ML predicts Waiting Time (~48 mins)
   ➔ Doctor logs in & clicks "Start Consultation"
   ➔ Token moves to "In Consultation"
   ➔ Patient receives in-app alert
   ➔ Doctor writes prescription & clicks "Complete Consultation"
   ➔ Current patient is archived to Consultation history
   ➔ Next patient (GM-006) automatically advances to Position #1
   ➔ Remaining patients' waiting-time predictions update dynamically
   ➔ Admin analytics charts update in real-time
```

---

## 6. Pre-Configured Demo Credentials

The database comes pre-seeded with realistic healthcare demo accounts:

| Role | Email Address | Password | Details |
|---|---|---|---|
| **Admin** | `admin@hospital.com` | `admin123` | Full hospital overview, doctor/dept controls, analytics |
| **Doctor** | `dr.rajesh@hospital.com` | `doctor123` | Dr. Rajesh Sharma, General Medicine (Active OPD Queue) |
| **Doctor** | `dr.sarah@hospital.com` | `doctor123` | Dr. Sarah Jenkins, Cardiology (Examination Room 204) |
| **Patient** | `john.doe@example.com` | `patient123` | John Doe (Has active token `GM-005` in waiting hall) |

*(Note: The login page includes 1-click demo credential fill buttons for fast testing).*

---

## 7. Installation & Quick Start Guide

### Prerequisites
* **Python:** 3.10 or higher
* **Node.js:** v18 or higher & `npm`

### Step 1: Install Python Dependencies
```bash
python -m pip install -r requirements.txt
```

### Step 2: (Optional) Re-Generate Dataset & Train ML Model
The repository already includes the pre-trained model and metadata. To retrain from scratch:
```bash
# Generate synthetic OPD dataset (3,500 samples)
python ml/dataset/generate_synthetic_data.py

# Train & compare Linear Regression vs Random Forest
python ml/train.py
```

### Step 3: Seed the Database
Initialize SQLite database with departments, doctors, synthetic patient records, and active queue tokens:
```bash
python backend/seed_data.py
```

### Step 4: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### Step 5: Run the Full-Stack Application

**Terminal 1 — Backend Server:**
```bash
# From project root:
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
# Or run: .\run_backend.bat
```
* Backend API runs at: `http://localhost:8000`
* Interactive API Docs (Swagger): `http://localhost:8000/docs`

**Terminal 2 — Frontend Application:**
```bash
# From project root:
cd frontend
npm run dev
# Or run: .\run_frontend.bat
```
* Web Portal opens at: `http://localhost:5173`

---

## 8. REST API Reference

### Prediction Endpoint (Section 5 Requirement)
* **Method:** `POST`
* **Route:** `/api/predict-waiting-time`
* **Request Payload:**
```json
{
  "department": "General Medicine",
  "doctor": "Dr. Rajesh Sharma",
  "patientsAhead": 5,
  "averageConsultationTime": 10.0,
  "currentQueueLength": 6,
  "availableDoctors": 1,
  "dayOfWeek": 1,
  "hour": 11,
  "noShowRate": 0.10
}
```
* **Response Payload:**
```json
{
  "predictedWaitingTime": 48,
  "unit": "minutes",
  "modelUsed": "Random Forest Regressor",
  "confidence": 0.98,
  "note": "Estimated waiting time is for informational purposes only and may change depending on hospital conditions."
}
```

### Core API Endpoints

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/auth/register` | Register new patient |
| **Auth** | `POST` | `/api/auth/login` | Login and receive JWT bearer token |
| **Auth** | `GET` | `/api/auth/me` | Fetch authenticated profile |
| **Queue** | `GET` | `/api/queue` | Public live queue board |
| **Queue** | `GET` | `/api/queue/doctor/{id}` | Doctor-specific active queue and current patient |
| **Queue** | `GET` | `/api/queue/patient/current` | Active patient token and queue progress |
| **Queue** | `POST` | `/api/queue/{id}/start` | Clinician starts consultation |
| **Queue** | `POST` | `/api/queue/{id}/complete` | Clinician completes consultation and notes |
| **Queue** | `POST` | `/api/queue/{id}/skip` | Clinician marks patient as skipped (no-show) |
| **Appointments** | `POST` | `/api/appointments` | Book appointment & generate token |
| **Appointments** | `POST` | `/api/appointments/{id}/cancel` | Cancel appointment & release token |
| **Admin** | `GET` | `/api/admin/overview` | Hospital overview KPIs |
| **Admin** | `GET` | `/api/admin/analytics` | Hourly, daily, and departmental chart data |
| **ML Hub** | `GET` | `/api/ml/metrics` | Model comparison, MAE/RMSE/R2, and metadata |

---

## 9. Verification & Automated Testing

An automated end-to-end integration test suite is included in `backend/test_workflow.py`. To run all 14 tests:
```bash
python backend/test_workflow.py
```

### Verified Test Cases:
1. `[PASS]` Backend health check endpoint
2. `[PASS]` Admin authentication & JWT token generation
3. `[PASS]` Patient authentication (John Doe)
4. `[PASS]` Department retrieval (4 departments active)
5. `[PASS]` Doctor directory lookup
6. `[PASS]` Direct ML Prediction API (`POST /api/predict-waiting-time`)
7. `[PASS]` Doctor authentication (Dr. Rajesh Sharma)
8. `[PASS]` Doctor active queue retrieval
9. `[PASS]` Doctor starts consultation (status transitions to `in_consultation`)
10. `[PASS]` Real-time queue re-indexing verified
11. `[PASS]` Consultation completion with prescription & clinical diagnosis storage
12. `[PASS]` Subsequent patient advancement to Queue Position #1 with updated waiting time
13. `[PASS]` Admin overview metrics aggregation
14. `[PASS]` Final-year ML metrics verification (Random Forest Regressor $R^2$: 0.9756)

---

## 10. Healthcare Safety Notice & Academic Disclaimer

> **IMPORTANT HEALTHCARE SAFETY NOTICE:**
> This system is an **academic software prototype** developed for computer science and engineering coursework.
> The estimated waiting time is strictly for **informational purposes only** and must not be used as a clinical triage decision or medical diagnostic tool. Actual waiting times may fluctuate based on emergency room arrivals, patient acuity, and clinical judgment.
> All patient records, doctor names, and clinical notes in the default database are **entirely synthetic** for demonstration purposes.

---

## 11. Project Directory Structure

```
hospital-queue-ai/
├── backend/
│   ├── api/
│   │   ├── admin.py
│   │   ├── appointments.py
│   │   ├── auth.py
│   │   ├── departments.py
│   │   ├── doctors.py
│   │   ├── notifications.py
│   │   ├── predict.py
│   │   └── queue.py
│   ├── models/
│   │   └── database_models.py
│   ├── schemas/
│   │   └── schemas.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── ml_service.py
│   │   └── queue_service.py
│   ├── database.py
│   ├── main.py
│   ├── seed_data.py
│   └── test_workflow.py
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── components/
│   │   │   ├── Footer.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── QueueProgress.jsx
│   │   │   ├── SafetyDisclaimer.jsx
│   │   │   └── StatCard.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AIPredictionPresentation.jsx
│   │   │   ├── DoctorDashboard.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── PatientDashboard.jsx
│   │   │   └── Register.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── ml/
│   ├── dataset/
│   │   ├── generate_synthetic_data.py
│   │   └── hospital_waiting_times_synthetic.csv
│   ├── model/
│   │   ├── best_model.joblib
│   │   └── model_metadata.json
│   ├── predict.py
│   └── train.py
├── database/
│   └── hospital.db
├── README.md
├── requirements.txt
├── run_backend.bat
└── run_frontend.bat
```
