"""
Model Training & Evaluation Script
Compares Linear Regression vs. Random Forest Regressor for Hospital Waiting-Time Prediction.
Evaluates MAE, RMSE, and R2 score, serializes the superior model and metadata for admin inspection.
"""

import os
import json
import time
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "hospital_waiting_times_synthetic.csv")
MODEL_DIR = os.path.join(BASE_DIR, "model")

def train_and_evaluate():
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATASET_PATH}. Please run generate_synthetic_data.py first.")

    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded dataset: {len(df)} rows.")

    categorical_features = ["department", "doctor"]
    numerical_features = [
        "patientsAhead",
        "averageConsultationTime",
        "currentQueueLength",
        "availableDoctors",
        "dayOfWeek",
        "hour",
        "noShowRate"
    ]
    target_column = "waitingTimeMinutes"

    X = df[categorical_features + numerical_features]
    y = df[target_column]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numerical_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features)
        ]
    )

    # 1. Linear Regression Pipeline
    lr_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", LinearRegression())
    ])

    print("Training Linear Regression...")
    start_lr = time.time()
    lr_pipeline.fit(X_train, y_train)
    lr_train_time = round(time.time() - start_lr, 3)
    lr_preds = lr_pipeline.predict(X_test)

    lr_mae = float(mean_absolute_error(y_test, lr_preds))
    lr_rmse = float(np.sqrt(mean_squared_error(y_test, lr_preds)))
    lr_r2 = float(r2_score(y_test, lr_preds))

    # 2. Random Forest Pipeline
    rf_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(n_estimators=120, max_depth=14, random_state=42, n_jobs=-1))
    ])

    print("Training Random Forest Regressor...")
    start_rf = time.time()
    rf_pipeline.fit(X_train, y_train)
    rf_train_time = round(time.time() - start_rf, 3)
    rf_preds = rf_pipeline.predict(X_test)

    rf_mae = float(mean_absolute_error(y_test, rf_preds))
    rf_rmse = float(np.sqrt(mean_squared_error(y_test, rf_preds)))
    rf_r2 = float(r2_score(y_test, rf_preds))

    print("\n--- Model Evaluation Results ---")
    print(f"Linear Regression:       MAE = {lr_mae:.2f} mins | RMSE = {lr_rmse:.2f} mins | R² = {lr_r2:.4f}")
    print(f"Random Forest Regressor: MAE = {rf_mae:.2f} mins | RMSE = {rf_rmse:.2f} mins | R² = {rf_r2:.4f}")

    # Determine better model (by higher R2 / lower MAE)
    if rf_r2 >= lr_r2:
        best_name = "Random Forest Regressor"
        best_pipeline = rf_pipeline
    else:
        best_name = "Linear Regression"
        best_pipeline = lr_pipeline

    print(f"\nSelected Model: {best_name}")

    # Extract feature importances if Random Forest
    rf_regressor = rf_pipeline.named_steps["regressor"]
    fitted_preprocessor = rf_pipeline.named_steps["preprocessor"]
    
    # Get feature names after one-hot encoding
    cat_names = fitted_preprocessor.named_transformers_["cat"].get_feature_names_out(categorical_features).tolist()
    all_feature_names = numerical_features + cat_names
    
    feature_importances = []
    if hasattr(rf_regressor, "feature_importances_"):
        importances = rf_regressor.feature_importances_
        for name, imp in sorted(zip(all_feature_names, importances), key=lambda x: x[1], reverse=True)[:10]:
            feature_importances.append({"feature": name, "importance": round(float(imp), 4)})

    # Test sample prediction
    sample_input = pd.DataFrame([{
        "department": "Cardiology",
        "doctor": "Dr. Sarah Jenkins",
        "patientsAhead": 5,
        "averageConsultationTime": 18.0,
        "currentQueueLength": 7,
        "availableDoctors": 1,
        "dayOfWeek": 2,
        "hour": 11,
        "noShowRate": 0.10
    }])
    sample_pred = float(best_pipeline.predict(sample_input)[0])

    # Save artifacts
    best_model_file = os.path.join(MODEL_DIR, "best_model.joblib")
    joblib.dump(best_pipeline, best_model_file)

    metadata = {
        "dataset_type": "Synthetic Hospital OPD Waiting-Time Benchmark",
        "is_synthetic": True,
        "total_samples": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "trained_at": datetime.now().isoformat(),
        "features": {
            "categorical": categorical_features,
            "numerical": numerical_features
        },
        "models_compared": {
            "linear_regression": {
                "name": "Linear Regression",
                "mae": round(lr_mae, 2),
                "rmse": round(lr_rmse, 2),
                "r2_score": round(lr_r2, 4),
                "train_time_sec": lr_train_time
            },
            "random_forest": {
                "name": "Random Forest Regressor",
                "mae": round(rf_mae, 2),
                "rmse": round(rf_rmse, 2),
                "r2_score": round(rf_r2, 4),
                "train_time_sec": rf_train_time,
                "n_estimators": 120,
                "max_depth": 14
            }
        },
        "best_model": {
            "name": best_name,
            "saved_file": "best_model.joblib",
            "mae": round(rf_mae if best_name == "Random Forest Regressor" else lr_mae, 2),
            "rmse": round(rf_rmse if best_name == "Random Forest Regressor" else lr_rmse, 2),
            "r2_score": round(rf_r2 if best_name == "Random Forest Regressor" else lr_r2, 4),
        },
        "top_feature_importances": feature_importances,
        "example_prediction": {
            "input": sample_input.to_dict(orient="records")[0],
            "predictedWaitingTime": round(sample_pred, 1),
            "unit": "minutes"
        },
        "disclaimer": "Academic prototype. Estimated waiting time is for informational purposes only and may change depending on hospital conditions."
    }

    metadata_file = os.path.join(MODEL_DIR, "model_metadata.json")
    with open(metadata_file, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Best model saved to {best_model_file}")
    print(f"Model metadata saved to {metadata_file}")
    return metadata

if __name__ == "__main__":
    train_and_evaluate()
