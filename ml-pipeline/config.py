"""
APA-DSS ML Pipeline - Path Configuration
Centralizes all paths so scripts can find each other.
"""

import os
from pathlib import Path

# Base directory (ml-pipeline)
BASE_DIR = Path(__file__).resolve().parent

# Sub-directories
DATA_DIR = BASE_DIR / 'data'
MODELS_DIR = BASE_DIR / 'models'
OUTPUTS_DIR = BASE_DIR / 'outputs'

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)

# File paths
RAW_CSV = DATA_DIR / 'raw_enrollments.csv'
FEATURES_CSV = DATA_DIR / 'features.csv'
MODEL_PATH = MODELS_DIR / 'logistic_regression.pkl'
SCALER_PATH = MODELS_DIR / 'scaler.pkl'
METADATA_PATH = MODELS_DIR / 'metadata.json'
METRICS_PATH = OUTPUTS_DIR / 'metrics.json'

# Database configuration
DB_CONFIG = {
    'host': os.getenv('APA_DSS_DB_HOST', 'localhost'),
    'port': int(os.getenv('APA_DSS_DB_PORT', 3306)),
    'user': os.getenv('APA_DSS_DB_USER', 'apa_dss_user'),
    'password': os.getenv('APA_DSS_DB_PASSWORD', 'APA_DSS_2026!'),
    'database': os.getenv('APA_DSS_DB_NAME', 'student_record_system')
}

# Feature columns used for ML
FEATURE_COLS = [
    'avg_mark',
    'num_failed',
    'num_modules',
    'failure_rate',
    'gpa',
    'avg_mark_last_sem',
    'year_level',
    'declining_trend',
]

TARGET_COL = 'at_risk'

# GPA mapping (South African grading scale)
GPA_MAP = {
    'A': 4.0,
    'B': 3.0,
    'C': 2.0,
    'D': 1.0,
    'F': 0.0
}