"""
Prediction Script
Generates at-risk predictions for all students.
Part of the APA-DSS ML Pipeline (CRISP-DM: Deployment)
Called by the Node.js backend to serve predictions.
"""

import sys
from pathlib import Path

# Add project root to path
BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import utf8_config  # noqa: F401 — sets UTF-8 mode for emojis on Windows

import json
import joblib
import pandas as pd
import numpy as np
from config import (
    FEATURE_COLS, MODEL_PATH, SCALER_PATH, METADATA_PATH, FEATURES_CSV
)


def predict_all():
    """Generate predictions for all students."""
    # Load model
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}\nRun 'python models/train.py' first.")

    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    # Load metadata
    with open(METADATA_PATH, 'r') as f:
        metadata = json.load(f)

    # Load features
    features_df = pd.read_csv(FEATURES_CSV).fillna(0)
    X = features_df[FEATURE_COLS].values
    X_scaled = scaler.transform(X)

    # Predictions
    probabilities = model.predict_proba(X_scaled)[:, 1]

    results = []
    for i, row in features_df.iterrows():
        prob = float(probabilities[i])

        # Risk level
        if prob >= 0.7:
            risk_level = 'High'
        elif prob >= 0.4:
            risk_level = 'Medium'
        else:
            risk_level = 'Low'

        # Human-readable factors
        factors = []
        if row['num_failed'] > 0:
            factors.append(f"Failed {int(row['num_failed'])} module(s)")
        if row['avg_mark'] < 50:
            factors.append(f"Very low average mark ({row['avg_mark']:.1f}%)")
        elif row['avg_mark'] < 65:
            factors.append(f"Below-average mark ({row['avg_mark']:.1f}%)")
        if row.get('declining_trend', 0) == 1:
            factors.append("Declining performance trend")
        if row.get('failure_rate', 0) >= 0.5:
            factors.append(f"Failed {row['failure_rate']*100:.0f}% of all modules")
        if row['gpa'] < 2.0:
            factors.append(f"Low GPA ({row['gpa']:.2f})")

        if not factors:
            factors.append("No significant risk factors identified")

        results.append({
            'id': int(row['student_id']),
            'name': row['student_name'],
            'programme': row['programme'],
            'faculty': row['faculty'],
            'avgMark': round(float(row['avg_mark']), 2),
            'failedModules': int(row['num_failed']),
            'totalModules': int(row['num_modules']),
            'gpa': round(float(row['gpa']), 2),
            'riskProbability': round(prob, 4),
            'riskLevel': risk_level,
            'factors': factors,
            'status': row['status']
        })

    # Sort by risk descending
    results.sort(key=lambda x: x['riskProbability'], reverse=True)

    return {
        'success': True,
        'data': results,
        'feature_importance': metadata.get('feature_importance', {}),
        'model_info': {
            'type': 'Logistic Regression',
            'n_train': metadata.get('n_train'),
            'n_test': metadata.get('n_test'),
            'n_positive': metadata.get('n_positive'),
            'n_negative': metadata.get('n_negative')
        }
    }


if __name__ == "__main__":
    try:
        output = predict_all()
        print(json.dumps(output))
    except Exception as e:
        error_output = {'success': False, 'error': str(e)}
        print(json.dumps(error_output))
        sys.exit(1)