"""
Model Evaluation Script
"""

import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import utf8_config  # noqa: F401

import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, classification_report,
    make_scorer
)
from config import (
    FEATURE_COLS, TARGET_COL, MODEL_PATH, SCALER_PATH,
    METRICS_PATH, FEATURES_CSV
)

def evaluate_model():
    """Evaluate the trained model on the TEST SET and with CROSS-VALIDATION."""
    print("\n" + "=" * 60)
    print("📈 MODEL EVALUATION")
    print("=" * 60)

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    # Load features
    features_df = pd.read_csv(FEATURES_CSV).fillna(0)
    X = features_df[FEATURE_COLS].values
    y = features_df[TARGET_COL].values

    # Reproduce the SAME split used in training
    test_size = 0.2 if len(X) >= 20 else 0.3
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42,
        stratify=y if np.sum(y == 1) >= 2 else None
    )

    X_test_scaled = scaler.transform(X_test)

    # ==================================================
    # PART 1: TEST SET EVALUATION
    # ==================================================
    print("\n" + "-" * 60)
    print("📊 PART 1: TEST SET EVALUATION")
    print("-" * 60)
    print(f"   Test set: {len(X_test)} samples")
    print(f"   At-risk: {np.sum(y_test == 1)}")
    print(f"   Not at-risk: {np.sum(y_test == 0)}")

    y_pred = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)

    try:
        auc_roc = roc_auc_score(y_test, y_proba)
    except ValueError:
        auc_roc = 0.0

    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    if cm.shape == (2, 2):
        tn, fp, fn, tp = cm.ravel()
    else:
        tn, fp, fn, tp = 0, 0, 0, 0

    print("\n📊 Test Set Performance Metrics:")
    print(f"   Accuracy:  {accuracy:.1%}")
    print(f"   Precision: {precision:.1%}")
    print(f"   Recall:    {recall:.1%}")
    print(f"   F1-Score:  {f1:.1%}")
    print(f"   AUC-ROC:   {auc_roc:.1%}")

    print("\n📊 Confusion Matrix (Test Set):")
    print("                        Predicted")
    print("                        Not At-Risk  At-Risk")
    print("   Actual")
    print(f"   Not At-Risk           {tn:6d}      {fp:6d}")
    print(f"   At-Risk               {fn:6d}      {tp:6d}")

    print("\n📊 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Not At-Risk', 'At-Risk'], zero_division=0))

    # ==================================================
    # PART 2: CROSS-VALIDATION
    # ==================================================
    print("\n" + "-" * 60)
    print("📊 PART 2: CROSS-VALIDATION (More Reliable)")
    print("-" * 60)

    cv_metrics = {}
    try:
        n_pos = int(np.sum(y == 1))
        n_folds = min(5, n_pos) if n_pos >= 2 else 2
        if n_folds < 2:
            n_folds = 2

        print(f"   Using Stratified {n_folds}-fold cross-validation...")

        cv = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)
        X_scaled = scaler.transform(X)

        precision_scorer = make_scorer(precision_score, zero_division=0)
        recall_scorer = make_scorer(recall_score, zero_division=0)
        f1_scorer = make_scorer(f1_score, zero_division=0)

        cv_accuracy = cross_val_score(model, X_scaled, y, cv=cv, scoring='accuracy')
        cv_precision = cross_val_score(model, X_scaled, y, cv=cv, scoring=precision_scorer)
        cv_recall = cross_val_score(model, X_scaled, y, cv=cv, scoring=recall_scorer)
        cv_f1 = cross_val_score(model, X_scaled, y, cv=cv, scoring=f1_scorer)

        print(f"\n📊 Cross-Validation Results ({n_folds}-fold):")
        print(f"   CV Accuracy:  {cv_accuracy.mean():.1%} (± {cv_accuracy.std():.1%})")
        print(f"   CV Precision: {cv_precision.mean():.1%} (± {cv_precision.std():.1%})")
        print(f"   CV Recall:    {cv_recall.mean():.1%} (± {cv_recall.std():.1%})")
        print(f"   CV F1-Score:  {cv_f1.mean():.1%} (± {cv_f1.std():.1%})")

        print("\n📊 Per-Fold Accuracy:")
        for i, score in enumerate(cv_accuracy, 1):
            print(f"   Fold {i}: {score:.1%}")

        cv_metrics = {
            'cv_accuracy_mean': round(float(cv_accuracy.mean()), 4),
            'cv_accuracy_std': round(float(cv_accuracy.std()), 4),
            'cv_precision_mean': round(float(cv_precision.mean()), 4),
            'cv_precision_std': round(float(cv_precision.std()), 4),
            'cv_recall_mean': round(float(cv_recall.mean()), 4),
            'cv_recall_std': round(float(cv_recall.std()), 4),
            'cv_f1_mean': round(float(cv_f1.mean()), 4),
            'cv_f1_std': round(float(cv_f1.std()), 4),
            'n_folds': int(n_folds),
            'cv_accuracy_scores': [round(float(s), 4) for s in cv_accuracy.tolist()]
        }
    except Exception as e:
        print(f"   ⚠️ Cross-validation failed: {e}")
        cv_metrics = {}

    # ==================================================
    # PART 3: SUMMARY
    # ==================================================
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)

    if cv_metrics:
        print(f"\n   Test Set Accuracy:  {accuracy:.1%}  (small sample = less reliable)")
        print(f"   CV Accuracy:        {cv_metrics['cv_accuracy_mean']:.1%} (± {cv_metrics['cv_accuracy_std']:.1%})  ← Use this")
        print(f"   CV Precision:       {cv_metrics['cv_precision_mean']:.1%}")
        print(f"   CV Recall:          {cv_metrics['cv_recall_mean']:.1%}")
        print(f"   CV F1-Score:        {cv_metrics['cv_f1_mean']:.1%}")

    metrics = {
        'accuracy': round(float(accuracy), 4),
        'precision': round(float(precision), 4),
        'recall': round(float(recall), 4),
        'f1_score': round(float(f1), 4),
        'auc_roc': round(float(auc_roc), 4),
        'confusion_matrix': {
            'true_negatives': int(tn),
            'false_positives': int(fp),
            'false_negatives': int(fn),
            'true_positives': int(tp)
        },
        'test_samples': int(len(y_test)),
        'train_samples': int(len(X_train)),
        'test_positive': int(np.sum(y_test == 1)),
        'test_negative': int(np.sum(y_test == 0)),
        'total_samples': int(len(y)),
        **cv_metrics
    }

    with open(METRICS_PATH, 'w') as f:
        json.dump(metrics, f, indent=2)

    print(f"\n✅ Metrics saved to {METRICS_PATH}")
    return metrics


if __name__ == "__main__":
    evaluate_model()