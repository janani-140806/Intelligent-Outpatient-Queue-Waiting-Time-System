"""
Synthetic Hospital Outpatient Queue Dataset Generator
Generates realistic historical OPD data for machine learning waiting-time prediction.
DISCLAIMER: This dataset contains synthetic data generated for educational and demonstration
purposes and does not represent confidential medical records.
"""

import os
import random
import numpy as np
import pandas as pd

DEPARTMENTS = {
    "General Medicine": {
        "doctors": ["Dr. Rajesh Sharma", "Dr. Emily Chen"],
        "base_avg_time": 10.0,
        "time_std": 2.5
    },
    "Cardiology": {
        "doctors": ["Dr. Marcus Vance", "Dr. Sarah Jenkins"],
        "base_avg_time": 18.0,
        "time_std": 4.0
    },
    "Pediatrics": {
        "doctors": ["Dr. Anita Desai", "Dr. Emily Chen"],
        "base_avg_time": 12.0,
        "time_std": 3.0
    },
    "Orthopedics": {
        "doctors": ["Dr. Marcus Vance", "Dr. Rajesh Sharma"],
        "base_avg_time": 15.0,
        "time_std": 3.5
    }
}

def generate_dataset(num_samples: int = 3500, random_seed: int = 42) -> pd.DataFrame:
    np.random.seed(random_seed)
    random.seed(random_seed)

    records = []

    dept_names = list(DEPARTMENTS.keys())

    for i in range(num_samples):
        department = random.choice(dept_names)
        dept_info = DEPARTMENTS[department]
        doctor = random.choice(dept_info["doctors"])

        # Operational features
        day_of_week = random.randint(0, 5)  # Mon (0) to Sat (5), Sunday closed or low
        hour = random.randint(8, 17)        # 8 AM to 5 PM
        
        # Doctor pace and consultation average
        avg_consultation_time = round(max(5.0, np.random.normal(dept_info["base_avg_time"], dept_info["time_std"])), 1)
        
        # Queue metrics
        patients_ahead = random.randint(0, 20)
        additional_waiting = random.randint(0, 10)
        current_queue_length = patients_ahead + additional_waiting
        
        available_doctors = random.choice([1, 1, 2, 2, 3])
        no_show_rate = round(random.uniform(0.04, 0.20), 2)

        # Realistic Waiting Time Formula:
        # Effective patients ahead accounting for no-shows
        effective_patients = patients_ahead * (1.0 - no_show_rate * 0.7)
        
        # Base waiting time divided by doctors serving the department
        base_time = (effective_patients * avg_consultation_time) / max(1, available_doctors)
        
        # Peak hospital hours (e.g., 10 AM - 1 PM OPD rush)
        peak_multiplier = 1.18 if (10 <= hour <= 13) else (1.08 if 14 <= hour <= 16 else 0.95)
        
        # Monday rush effect
        day_multiplier = 1.12 if day_of_week == 0 else (1.05 if day_of_week == 5 else 1.0)
        
        # Random emergency consultation interruption or delay (e.g. urgent triage patient)
        emergency_delay = np.random.choice([0, 0, 0, 4, 8, 12], p=[0.60, 0.15, 0.10, 0.08, 0.05, 0.02])
        
        # Stochastic variance
        noise = np.random.normal(0, 1.8)
        
        predicted_time = (base_time * peak_multiplier * day_multiplier) + emergency_delay + noise
        actual_waiting_time = max(1.0, round(predicted_time, 1))

        records.append({
            "department": department,
            "doctor": doctor,
            "patientsAhead": patients_ahead,
            "averageConsultationTime": avg_consultation_time,
            "currentQueueLength": current_queue_length,
            "availableDoctors": available_doctors,
            "dayOfWeek": day_of_week,
            "hour": hour,
            "noShowRate": no_show_rate,
            "waitingTimeMinutes": actual_waiting_time,
            "isSynthetic": True
        })

    df = pd.DataFrame(records)
    return df

if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "hospital_waiting_times_synthetic.csv")
    df = generate_dataset(3500)
    df.to_csv(out_path, index=False)
    print(f"Generated {len(df)} synthetic records saved to {out_path}")
    print(df.head())
