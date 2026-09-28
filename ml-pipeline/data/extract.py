"""
Data Extraction Script
Extracts student enrollment data from the student_record_system database.
Part of the APA-DSS ML Pipeline (CRISP-DM: Data Understanding)
"""
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import utf8_config  # noqa: F401

import mysql.connector
import pandas as pd
from config import DB_CONFIG, RAW_CSV, DATA_DIR



def get_connection():
    """Create a database connection."""
    return mysql.connector.connect(**DB_CONFIG)


def extract_student_data():
    """
    Extract per-student academic data with engineered features.
    Returns a pandas DataFrame.
    """
    print("📊 Extracting student data from database...")
    
    conn = get_connection()
    
    query = """
        SELECT 
            s.Student_ID,
            s.Student_Name,
            s.Programme_Code,
            p.Faculty_Code,
            s.Enrollment_Status,
            se.Module_Code,
            se.Semester_Code,
            se.Mark_Obtained,
            se.Grade,
            m.Credit_Hours,
            m.Year_Level
        FROM students s
        JOIN student_enrollments se ON s.Student_ID = se.Student_ID
        LEFT JOIN programmes p ON s.Programme_Code = p.Programme_Code
        LEFT JOIN modules m ON se.Module_Code = m.Module_Code
        WHERE se.Status = 'Completed'
          AND se.Mark_Obtained IS NOT NULL
        ORDER BY s.Student_ID, se.Semester_Code
    """
    
    df = pd.read_sql(query, conn)
    conn.close()
    
    print(f"✅ Extracted {len(df)} enrollment records")
    print(f"   Students: {df['Student_ID'].nunique()}")
    print(f"   Modules: {df['Module_Code'].nunique()}")
    print(f"   Semesters: {df['Semester_Code'].nunique()}")
    
    return df


if __name__ == "__main__":
    df = extract_student_data()
    df.to_csv(RAW_CSV, index=False)
    print(f"💾 Saved to {RAW_CSV}")