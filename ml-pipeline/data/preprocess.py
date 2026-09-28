"""
Feature Engineering Script
Transforms raw enrollment data into ML-ready features.
Part of the APA-DSS ML Pipeline (CRISP-DM: Data Preparation)
"""
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import utf8_config  # noqa: F401

import pandas as pd
import numpy as np
from config import GPA_MAP, FEATURES_CSV, RAW_CSV

def engineer_features(df):
    """
    Engineer features for ML:
    - avg_mark: Student's average mark across all modules
    - num_failed: Total failed modules
    - num_modules: Total modules attempted
    - failure_rate: Percentage of failed modules
    - gpa: Grade Point Average
    - avg_mark_last_sem: Average mark in most recent semester
    - failed_last_sem: Failed modules in most recent semester
    - failure_rate_last_sem: Failure rate in most recent semester
    - declining_trend: 1 if declining, 0 otherwise
    - year_level: Current year level
    """
    print("🔧 Engineering features...")
    
    # Clean data
    df = df.copy()
    df['Student_ID'] = df['Student_ID'].astype(int)
    df['Mark_Obtained'] = pd.to_numeric(df['Mark_Obtained'], errors='coerce')
    df = df.dropna(subset=['Mark_Obtained'])
    
    # Map grades to GPA points
    df['gpa_point'] = df['Grade'].map(GPA_MAP)
    
    # === AGGREGATE FEATURES PER STUDENT ===
    features = df.groupby('Student_ID').agg(
        student_name=('Student_Name', 'first'),
        programme=('Programme_Code', 'first'),
        faculty=('Faculty_Code', 'first'),
        status=('Enrollment_Status', 'first'),
        avg_mark=('Mark_Obtained', 'mean'),
        num_modules=('Module_Code', 'count'),
        gpa=('gpa_point', 'mean'),
        year_level=('Year_Level', 'max'),
        total_credits=('Credit_Hours', 'sum')
    ).reset_index()
    
    # Rename Student_ID column to student_id
    features = features.rename(columns={'Student_ID': 'student_id'})
    
    # === FAILED MODULE COUNT ===
    failed_df = df[df['Grade'] == 'F'].groupby('Student_ID').size().reset_index(name='num_failed')
    failed_df = failed_df.rename(columns={'Student_ID': 'student_id'})
    features = features.merge(failed_df, on='student_id', how='left')
    features['num_failed'] = features['num_failed'].fillna(0).astype(int)
    
    # === FAILURE RATE ===
    features['failure_rate'] = features['num_failed'] / features['num_modules']
    
    # === LATEST SEMESTER FEATURES ===
    # Get most recent semester per student
    latest_sem = df.groupby('Student_ID')['Semester_Code'].max().reset_index()
    latest_sem = latest_sem.rename(columns={'Student_ID': 'student_id', 'Semester_Code': 'latest_sem'})
    
    # Merge back to identify latest semester records
    df_with_latest = df.merge(latest_sem, left_on='Student_ID', right_on='student_id', how='left')
    latest_records = df_with_latest[df_with_latest['Semester_Code'] == df_with_latest['latest_sem']]
    
    # Average mark in latest semester
    latest_avg = latest_records.groupby('student_id').agg(
        avg_mark_last_sem=('Mark_Obtained', 'mean'),
        total_last_sem=('Module_Code', 'count')
    ).reset_index()
    
    # Failed in latest semester
    latest_failed = latest_records[latest_records['Grade'] == 'F'].groupby('student_id').size().reset_index(name='failed_last_sem')
    
    # Merge latest features
    features = features.merge(latest_avg, on='student_id', how='left')
    features = features.merge(latest_failed, on='student_id', how='left')
    
    # Fill missing values
    features['avg_mark_last_sem'] = features['avg_mark_last_sem'].fillna(features['avg_mark'])
    features['total_last_sem'] = features['total_last_sem'].fillna(1)
    features['failed_last_sem'] = features['failed_last_sem'].fillna(0).astype(int)
    features['failure_rate_last_sem'] = features['failed_last_sem'] / features['total_last_sem']
    
    # === DECLINING TREND ===
    semester_marks = df.groupby(['Student_ID', 'Semester_Code'])['Mark_Obtained'].mean().reset_index()
    semester_marks = semester_marks.sort_values(['Student_ID', 'Semester_Code'])
    
    def compute_trend(group):
        if len(group) < 2:
            return 0
        first_half = group.iloc[:len(group)//2]['Mark_Obtained'].mean()
        second_half = group.iloc[len(group)//2:]['Mark_Obtained'].mean()
        return 1 if second_half < first_half else 0
    
    trends = semester_marks.groupby('Student_ID').apply(compute_trend).reset_index(name='declining_trend')
    trends = trends.rename(columns={'Student_ID': 'student_id'})
    features = features.merge(trends, on='student_id', how='left')
    features['declining_trend'] = features['declining_trend'].fillna(0).astype(int)
    
    # === TARGET VARIABLE: AT-RISK ===
    # At-Risk = Failed 50%+ of modules in most recent semester
    features['at_risk'] = (features['failure_rate_last_sem'] >= 0.5).astype(int)
    
    # Round numerical features
    numeric_cols = ['avg_mark', 'gpa', 'avg_mark_last_sem', 'failure_rate', 'failure_rate_last_sem']
    for col in numeric_cols:
        features[col] = features[col].round(4)
    
    print(f"✅ Feature engineering complete")
    print(f"   Total students: {len(features)}")
    print(f"   At-risk students: {features['at_risk'].sum()} ({features['at_risk'].mean()*100:.1f}%)")
    print(f"   Features: {[c for c in features.columns if c not in ('student_id', 'student_name', 'programme', 'faculty', 'status')]}")
    
    return features


if __name__ == "__main__":
    # Load raw data
    if not RAW_CSV.exists():
        print("⚠️ Raw data not found. Running extract.py first...")
        from extract import extract_student_data
        df = extract_student_data()
        df.to_csv(RAW_CSV, index=False)
    else:
        df = pd.read_csv(RAW_CSV)
    
    features = engineer_features(df)
    features.to_csv(FEATURES_CSV, index=False)
    print(f"💾 Saved to {FEATURES_CSV}")
    print("\n📊 Feature preview:")
    print(features.head())