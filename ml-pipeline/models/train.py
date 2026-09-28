"""
Model Training Script
"""

import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))
sys.path.insert(0, str(BASE / 'data'))

import utf8_config  # noqa: F401

import pandas as pd
import numpy as np
import json
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from config import FEATURE_COLS, TARGET_COL, MODEL_PATH, SCALER_PATH, METADATA_PATH, FEATURES_CSV
def train_model():
    """Train the Logistic Regression model."""
    print("\n" + "="*60)
    print("🤖 APA-DSS MACHINE LEARNING PIPELINE")
    print("="*60)
    
    # === STEP 1: LOAD FEATURES ===
    print("\n[1/6] Loading features...")
    if not FEATURES_CSV.exists():
        raise FileNotFoundError(
            f"Features file not found: {FEATURES_CSV}\n"
            "Please run 'python data/preprocess.py' first."
        )
    features_df = pd.read_csv(FEATURES_CSV)
    features_df = features_df.fillna(0)
    print(f"   Loaded {len(features_df)} students")
    
    # === STEP 2: PREPARE X AND y ===
    print("\n[2/6] Preparing features and target...")
    X = features_df[FEATURE_COLS].values
    y = features_df[TARGET_COL].values
    
    n_pos = int(np.sum(y == 1))
    n_neg = int(np.sum(y == 0))
    print(f"   At-Risk (positive): {n_pos}")
    print(f"   Not At-Risk (negative): {n_neg}")
    print(f"   Class balance: {n_pos/(n_pos+n_neg)*100:.1f}% at-risk")
    
    if n_pos < 2 or n_neg < 2:
        raise ValueError("Not enough samples in one class to train a model")
    
    # === STEP 3: TRAIN-TEST SPLIT ===
    print("\n[3/6] Splitting data (80/20)...")
    test_size = 0.2
    if len(X) < 20:
        # For very small datasets, use a larger test set
        test_size = 0.3
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, stratify=y if n_pos >= 2 else None
    )
    print(f"   Training samples: {len(X_train)}")
    print(f"   Test samples: {len(X_test)}")
    
    # === STEP 4: FEATURE SCALING ===
    print("\n[4/6] Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # === STEP 5: TRAIN MODEL ===
    print("\n[5/6] Training Logistic Regression model...")
    model = LogisticRegression(
        class_weight='balanced',
        random_state=42,
        max_iter=1000
    )
    model.fit(X_train_scaled, y_train)
    
    # === STEP 6: SAVE ARTIFACTS ===
    print("\n[6/6] Saving model and artifacts...")
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    
    # Feature importance
    feature_importance = dict(zip(FEATURE_COLS, model.coef_[0].tolist()))
    
    print("\n" + "="*60)
    print("📊 FEATURE IMPORTANCE (Model Coefficients)")
    print("="*60)
    for feature, coef in sorted(feature_importance.items(), key=lambda x: abs(x[1]), reverse=True):
        direction = "↑ increases risk" if coef > 0 else "↓ decreases risk"
        print(f"   {feature:25s} {coef:+.4f}  ({direction})")
    
    # Metadata
    metadata = {
        'feature_cols': FEATURE_COLS,
        'target_col': TARGET_COL,
        'feature_importance': feature_importance,
        'n_train': int(len(X_train)),
        'n_test': int(len(X_test)),
        'n_positive': n_pos,
        'n_negative': n_neg,
        'test_size': test_size
    }
    
    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✅ Model saved to {MODEL_PATH}")
    print(f"✅ Scaler saved to {SCALER_PATH}")
    print(f"✅ Metadata saved to {METADATA_PATH}")
    
    return model, scaler, metadata


if __name__ == "__main__":
    train_model()