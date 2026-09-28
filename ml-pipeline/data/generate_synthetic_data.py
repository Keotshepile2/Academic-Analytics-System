"""
================================================================
APA-DSS Synthetic Data Generator
================================================================
Generates a realistic synthetic dataset for the Academic Performance
Analytics & Decision Support System (APA-DSS).

Output: ml-pipeline/data/synthetic_data.sql

Design (matching the project proposal):
- 5 faculties (FCS, FEN, FBS, FAS, FHS)
- 5 programmes across faculties
- 6 semesters of history (2023 S1 through 2025 S2)
- 6-8 modules per programme per semester
- 600 students with realistic name distributions
- Realistic mark distributions with hard/easy module weighting
- 12-18% of students who genuinely struggle across semesters
- Reproducible via fixed random seed

IMPORTANT: This generator does NOT touch the `admins` table.
================================================================
"""

import random
from datetime import date, timedelta
from pathlib import Path

# ================================================================
# CONFIGURATION
# ================================================================

RANDOM_SEED = 42
NUM_STUDENTS = 600
OUTPUT_FILE = Path(__file__).resolve().parent / "synthetic_data.sql"

# Grade boundaries (South African university convention)
GRADE_BOUNDARIES = [
    (75, 'A'),
    (70, 'B'),
    (60, 'C'),
    (50, 'D'),
    (0,  'F'),
]

# Mark distribution profiles
PROFILE_MAINSTREAM  = {'weight': 0.75, 'mean': 62, 'sd': 10}
PROFILE_STRUGGLING  = {'weight': 0.15, 'mean': 45, 'sd': 10}
PROFILE_EXCELLENT   = {'weight': 0.10, 'mean': 78, 'sd': 8}

# ================================================================
# FACULTIES & PROGRAMMES
# ================================================================

FACULTIES = [
    ('FCS', 'Faculty of Computer Science'),
    ('FEN', 'Faculty of Engineering'),
    ('FBS', 'Faculty of Business Studies'),
    ('FAS', 'Faculty of Arts & Social Sciences'),
    ('FHS', 'Faculty of Health Sciences'),
]

# Each programme: (code, name, faculty_code, duration_years)
PROGRAMMES = [
    ('BSC-CS',  'BSc Computer Science',                 'FCS', 3),
    ('BEN-CE',  'BEng Civil Engineering',               'FEN', 3),
    ('BBA-BA',  'BBA Business Administration',          'FBS', 3),
    ('BSC-MCS', 'BSc Mathematical & Computer Sciences', 'FCS', 3),
    ('BSC-PS',  'BSc Physical Science',                 'FCS', 3),
]

# ================================================================
# SEMESTERS (6 total: 2023 S1 - 2025 S2)
# ================================================================

SEMESTERS = [
    ('S20231', 2023, 1, date(2023, 2, 1),  date(2023, 6, 30)),
    ('S20232', 2023, 2, date(2023, 7, 1),  date(2023, 11, 30)),
    ('S20241', 2024, 1, date(2024, 2, 1),  date(2024, 6, 30)),
    ('S20242', 2024, 2, date(2024, 7, 1),  date(2024, 11, 30)),
    ('S20251', 2025, 1, date(2025, 2, 1),  date(2025, 6, 30)),
    ('S20252', 2025, 2, date(2025, 7, 1),  date(2025, 11, 30)),
]

# ================================================================
# MODULE CATALOGUE
# ================================================================
# Each module: (code, name, programme_code, year_level, semester_offered,
#               credit_hours, difficulty_offset)
# difficulty_offset: positive = easier, negative = harder
# ================================================================

MODULES = [
    # ---- BSc Computer Science (BSC-CS) ----
    ('CS101', 'Introduction to Programming',      'BSC-CS', 1, 1, 15,  4),
    ('CS102', 'Computer Fundamentals',            'BSC-CS', 1, 1, 10,  5),
    ('CS103', 'Mathematics for Computing I',      'BSC-CS', 1, 1, 15, -6),
    ('CS104', 'Web Development I',                'BSC-CS', 1, 1, 12,  3),
    ('CS105', 'Database Fundamentals',            'BSC-CS', 1, 1, 15,  2),
    ('CS106', 'Communication Skills',             'BSC-CS', 1, 1,  8,  6),
    ('CS107', 'Object-Oriented Programming',      'BSC-CS', 1, 2, 15, -3),
    ('CS108', 'Data Structures',                  'BSC-CS', 1, 2, 15, -5),
    ('CS109', 'Mathematics for Computing II',     'BSC-CS', 1, 2, 15, -7),
    ('CS110', 'Web Development II',               'BSC-CS', 1, 2, 12,  2),
    ('CS111', 'Ethics in Computing',              'BSC-CS', 1, 2,  8,  5),
    ('CS201', 'Algorithms & Complexity',          'BSC-CS', 2, 1, 15, -6),
    ('CS202', 'Database Systems',                 'BSC-CS', 2, 1, 15, -2),
    ('CS203', 'Operating Systems',                'BSC-CS', 2, 1, 15, -4),
    ('CS204', 'Software Engineering',             'BSC-CS', 2, 1, 15,  0),
    ('CS205', 'Computer Networks',                'BSC-CS', 2, 1, 12, -1),
    ('CS206', 'Advanced Programming',             'BSC-CS', 2, 2, 15, -4),
    ('CS207', 'Artificial Intelligence',          'BSC-CS', 2, 2, 15, -7),
    ('CS208', 'Web Application Development',      'BSC-CS', 2, 2, 15, -1),
    ('CS209', 'Information Security',             'BSC-CS', 2, 2, 12, -3),
    ('CS210', 'Research Methodology',             'BSC-CS', 2, 2, 10,  2),
    ('CS301', 'Project Management',               'BSC-CS', 3, 1, 15,  1),
    ('CS302', 'Mobile Application Development',   'BSC-CS', 3, 1, 15, -2),
    ('CS303', 'Cloud Computing',                  'BSC-CS', 3, 1, 15, -2),
    ('CS304', 'Data Science & Analytics',         'BSC-CS', 3, 1, 15, -6),
    ('CS305', 'Final Year Project I',             'BSC-CS', 3, 2, 20,  0),
    ('CS306', 'Final Year Project II',            'BSC-CS', 3, 2, 20,  0),
    ('CS307', 'Entrepreneurship',                 'BSC-CS', 3, 2, 10,  4),
    ('CS308', 'Professional Practice',            'BSC-CS', 3, 2, 10,  5),

    # ---- BEng Civil Engineering (BEN-CE) ----
    ('CE101', 'Engineering Mathematics I',        'BEN-CE', 1, 1, 20, -8),
    ('CE102', 'Engineering Physics',              'BEN-CE', 1, 1, 15, -6),
    ('CE103', 'Engineering Drawing',              'BEN-CE', 1, 1, 12,  1),
    ('CE104', 'Introduction to Civil Engineering','BEN-CE', 1, 1,  8,  5),
    ('CE105', 'Engineering Chemistry',            'BEN-CE', 1, 1, 15, -4),
    ('CE106', 'Engineering Mathematics II',       'BEN-CE', 1, 2, 20, -9),
    ('CE107', 'Mechanics of Materials',           'BEN-CE', 1, 2, 15, -6),
    ('CE108', 'Surveying I',                      'BEN-CE', 1, 2, 12,  0),
    ('CE109', 'Civil Engineering Practice',       'BEN-CE', 1, 2, 10,  3),
    ('CE110', 'Environmental Science',            'BEN-CE', 1, 2, 10,  4),
    ('CE201', 'Structural Analysis I',            'BEN-CE', 2, 1, 15, -6),
    ('CE202', 'Fluid Mechanics',                  'BEN-CE', 2, 1, 15, -7),
    ('CE203', 'Geotechnical Engineering I',       'BEN-CE', 2, 1, 15, -4),
    ('CE204', 'Construction Materials',           'BEN-CE', 2, 1, 12,  0),
    ('CE205', 'CAD for Civil Engineering',        'BEN-CE', 2, 1, 10,  3),
    ('CE206', 'Structural Analysis II',           'BEN-CE', 2, 2, 15, -7),
    ('CE207', 'Hydrology & Water Engineering',    'BEN-CE', 2, 2, 15, -5),
    ('CE208', 'Transportation Engineering',       'BEN-CE', 2, 2, 15, -3),
    ('CE209', 'Construction Management',          'BEN-CE', 2, 2, 12,  0),
    ('CE210', 'Structural Design I',              'BEN-CE', 2, 2, 15, -5),
    ('CE301', 'Structural Design II',             'BEN-CE', 3, 1, 20, -6),
    ('CE302', 'Geotechnical Engineering II',      'BEN-CE', 3, 1, 15, -7),
    ('CE303', 'Water & Wastewater Engineering',   'BEN-CE', 3, 1, 15, -4),
    ('CE304', 'Construction Technology',          'BEN-CE', 3, 1, 12,  0),
    ('CE305', 'Final Year Project',               'BEN-CE', 3, 2, 25,  0),
    ('CE306', 'Urban Planning & Design',          'BEN-CE', 3, 2, 15, -1),
    ('CE307', 'Engineering Management',           'BEN-CE', 3, 2, 12,  2),
    ('CE308', 'Structural Health Monitoring',     'BEN-CE', 3, 2, 10, -3),

    # ---- BBA Business Administration (BBA-BA) ----
    ('BA101', 'Principles of Management',         'BBA-BA', 1, 1, 15,  5),
    ('BA102', 'Business Mathematics',             'BBA-BA', 1, 1, 15, -4),
    ('BA103', 'Business Communication',           'BBA-BA', 1, 1, 10,  7),
    ('BA104', 'Introduction to Accounting',       'BBA-BA', 1, 1, 15, -3),
    ('BA105', 'Business Law',                     'BBA-BA', 1, 1, 12,  1),
    ('BA106', 'Managerial Accounting',            'BBA-BA', 1, 2, 15, -3),
    ('BA107', 'Marketing Principles',             'BBA-BA', 1, 2, 15,  4),
    ('BA108', 'Business Economics',               'BBA-BA', 1, 2, 15, -4),
    ('BA109', 'Information Systems',              'BBA-BA', 1, 2, 12,  2),
    ('BA110', 'Business Ethics',                  'BBA-BA', 1, 2, 10,  6),
    ('BA201', 'Financial Management',             'BBA-BA', 2, 1, 15, -3),
    ('BA202', 'Organizational Behavior',          'BBA-BA', 2, 1, 15,  4),
    ('BA203', 'Business Research Methods',        'BBA-BA', 2, 1, 15, -2),
    ('BA204', 'Human Resource Management',        'BBA-BA', 2, 1, 15,  3),
    ('BA205', 'Marketing Management',             'BBA-BA', 2, 1, 12,  2),
    ('BA206', 'Strategic Management',             'BBA-BA', 2, 2, 15, -3),
    ('BA207', 'Operations Management',            'BBA-BA', 2, 2, 15, -3),
    ('BA208', 'Business Finance',                 'BBA-BA', 2, 2, 15, -4),
    ('BA209', 'International Business',           'BBA-BA', 2, 2, 12,  0),
    ('BA210', 'Business Analytics',               'BBA-BA', 2, 2, 12, -3),
    ('BA301', 'Corporate Strategy',               'BBA-BA', 3, 1, 15, -2),
    ('BA302', 'Entrepreneurship & Innovation',    'BBA-BA', 3, 1, 15,  1),
    ('BA303', 'Investment Management',            'BBA-BA', 3, 1, 15, -4),
    ('BA304', 'Supply Chain Management',          'BBA-BA', 3, 1, 12, -2),
    ('BA305', 'Business Project I',               'BBA-BA', 3, 2, 20,  1),
    ('BA306', 'Business Project II',              'BBA-BA', 3, 2, 20,  1),
    ('BA307', 'Management Consulting',            'BBA-BA', 3, 2, 12,  0),
    ('BA308', 'Business & Society',               'BBA-BA', 3, 2, 10,  4),

    # ---- BSc Mathematical & Computer Sciences (BSC-MCS) ----
    ('MC101', 'Calculus I',                       'BSC-MCS', 1, 1, 16, -7),
    ('MC102', 'Intro to Statistics',              'BSC-MCS', 1, 1, 16, -4),
    ('MC103', 'Programming Fundamentals',         'BSC-MCS', 1, 1, 16,  2),
    ('MC104', 'Discrete Mathematics',             'BSC-MCS', 1, 1, 16, -6),
    ('MC105', 'Linear Algebra',                   'BSC-MCS', 1, 2, 16, -6),
    ('MC106', 'Calculus II',                      'BSC-MCS', 1, 2, 16, -8),
    ('MC107', 'Probability Theory',               'BSC-MCS', 1, 2, 16, -5),
    ('MC201', 'Advanced Calculus',                'BSC-MCS', 2, 1, 16, -7),
    ('MC202', 'Numerical Methods',                'BSC-MCS', 2, 1, 16, -5),
    ('MC203', 'Data Structures & Algorithms',     'BSC-MCS', 2, 1, 16, -4),
    ('MC204', 'Statistical Inference',            'BSC-MCS', 2, 2, 16, -5),
    ('MC205', 'Abstract Algebra',                 'BSC-MCS', 2, 2, 16, -7),
    ('MC206', 'Database Systems',                 'BSC-MCS', 2, 2, 16, -2),
    ('MC301', 'Real Analysis',                    'BSC-MCS', 3, 1, 16, -8),
    ('MC302', 'Machine Learning',                 'BSC-MCS', 3, 1, 16, -5),
    ('MC303', 'Cryptography',                     'BSC-MCS', 3, 1, 16, -6),
    ('MC304', 'Complex Analysis',                 'BSC-MCS', 3, 2, 16, -8),
    ('MC305', 'Research Project',                 'BSC-MCS', 3, 2, 20,  0),

    # ---- BSc Physical Science (BSC-PS) ----
    ('PS101', 'Physics I (Mechanics)',            'BSC-PS', 1, 1, 16, -6),
    ('PS102', 'Chemistry I',                      'BSC-PS', 1, 1, 16, -4),
    ('PS103', 'Mathematics I',                    'BSC-PS', 1, 1, 16, -7),
    ('PS104', 'Physics II (Electricity)',         'BSC-PS', 1, 2, 16, -7),
    ('PS105', 'Chemistry II',                     'BSC-PS', 1, 2, 16, -4),
    ('PS106', 'Mathematics II',                   'BSC-PS', 1, 2, 16, -8),
    ('PS201', 'Thermodynamics',                   'BSC-PS', 2, 1, 16, -7),
    ('PS202', 'Organic Chemistry',                'BSC-PS', 2, 1, 16, -5),
    ('PS203', 'Modern Physics',                   'BSC-PS', 2, 1, 16, -6),
    ('PS204', 'Analytical Chemistry',             'BSC-PS', 2, 2, 16, -4),
    ('PS205', 'Electromagnetism',                 'BSC-PS', 2, 2, 16, -7),
    ('PS301', 'Quantum Mechanics',                'BSC-PS', 3, 1, 16, -9),
    ('PS302', 'Statistical Mechanics',            'BSC-PS', 3, 1, 16, -8),
    ('PS303', 'Physical Chemistry',               'BSC-PS', 3, 2, 16, -5),
    ('PS304', 'Research Project',                 'BSC-PS', 3, 2, 20,  0),
]

# ================================================================
# NAME POOLS (South African flavour)
# ================================================================

FIRST_NAMES = [
    'Thabo', 'Lerato', 'Sipho', 'Naledi', 'Kabelo', 'Nomvula', 'Tebogo', 'Zanele',
    'Sibusiso', 'Ayanda', 'Mpho', 'Bongani', 'Dineo', 'Katlego', 'Tumelo', 'Refilwe',
    'Kagiso', 'Naledi', 'Tshepo', 'Boitumelo', 'Neo', 'Palesa', 'Karabo', 'Keitumetse',
    'Thato', 'Lindiwe', 'Siyanda', 'Nokuthula', 'Njabulo', 'Amahle', 'Bandile', 'Zodwa',
    'Mandla', 'Lwazi', 'Nomsa', 'Sizwe', 'Precious', 'Blessing', 'Hope', 'Faith',
    'Grace', 'Talent', 'Panashe', 'Tariro', 'Rudo', 'Tanaka', 'Chipo', 'Nyasha',
    'Ruan', 'Marike', 'Anja', 'Willem', 'Pieter', 'Elsabe', 'Marius', 'Annelie',
    'Craig', 'Melanie', 'Shannon', 'Dean', 'Kyle', 'Michaela', 'Ryan', 'Claire',
    'Aiden', 'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia', 'Lucas', 'Isabella',
    'Rohan', 'Priya', 'Aarav', 'Anika', 'Devan', 'Sara', 'Yusuf', 'Fatima',
    'Ahmed', 'Zainab', 'Omar', 'Aisha', 'Daniel', 'Rachel', 'Joshua', 'Hannah',
    'David', 'Rebecca', 'Samuel', 'Abigail', 'Benjamin', 'Naomi', 'Michael', 'Ruth',
]

LAST_NAMES = [
    'Mokoena', 'Ndlovu', 'Dlamini', 'Nkosi', 'Khumalo', 'Sithole', 'Mahlangu',
    'Zulu', 'Mthembu', 'Mabaso', 'Naidoo', 'Pillay', 'Govender', 'Sithole',
    'Pretorius', 'Van der Merwe', 'Botha', 'Van Wyk', 'Steyn', 'Joubert',
    'Nel', 'Fourie', 'Venter', 'Coetzee', 'Du Plessis', 'Smit', 'Meyer',
    'Jacobs', 'Adams', 'Petersen', 'Hendricks', 'Solomons', 'Abrahams',
    'Williams', 'Brown', 'Davids', 'Fortuin', 'September', 'Arendse',
    'Khumalo', 'Mahlatsi', 'Modise', 'Ramaphosa', 'Motsepe', 'Sekhukhune',
    'Johnson', 'Smith', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White',
    'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark',
    'Patel', 'Sharma', 'Khan', 'Mohamed', 'Ismail', 'Cassim', 'Bhyat',
]

# ================================================================
# SQL ESCAPING
# ================================================================

def sql_escape(value):
    """Escape single quotes in strings."""
    if value is None:
        return 'NULL'
    if isinstance(value, str):
        return "'" + value.replace("\\", "\\\\").replace("'", "''") + "'"
    if isinstance(value, date):
        return "'" + value.strftime("%Y-%m-%d") + "'"
    return str(value)


# ================================================================
# GENERATOR
# ================================================================

def main():
    random.seed(RANDOM_SEED)
    print(f"[GEN] Seeded RNG with {RANDOM_SEED}")
    print(f"[GEN] Generating {NUM_STUDENTS} students...")

    lines = []
    add = lines.append

    # -------- HEADER --------
    add("-- ============================================================")
    add("-- APA-DSS Synthetic Dataset")
    add(f"-- Generated with seed = {RANDOM_SEED}")
    add(f"-- Students: {NUM_STUDENTS}")
    add("-- Faculties: 5, Programmes: 5, Semesters: 6")
    add("-- The admins table is NOT touched by this script.")
    add("-- ============================================================")
    add("")
    add("USE student_record_system;")
    add("SET FOREIGN_KEY_CHECKS = 0;")
    add("")

    # -------- TRUNCATE (preserving admins) --------
    add("-- Clean existing data (preserve admins)")
    add("DELETE FROM student_enrollments;")
    add("DELETE FROM students;")
    add("DELETE FROM modules;")
    add("DELETE FROM programmes;")
    add("DELETE FROM faculties;")
    add("DELETE FROM semesters;")
    add("")

    # -------- FACULTIES --------
    add("-- ============================================================")
    add("-- FACULTIES")
    add("-- ============================================================")
    for code, name in FACULTIES:
        add(f"INSERT INTO faculties (Faculty_Code, Faculty_Name) VALUES "
            f"({sql_escape(code)}, {sql_escape(name)});")
    add("")

    # -------- PROGRAMMES --------
    add("-- ============================================================")
    add("-- PROGRAMMES")
    add("-- ============================================================")
    for code, name, fac, dur in PROGRAMMES:
        add(f"INSERT INTO programmes (Programme_Code, Programme_Name, Faculty_Code, Duration_Years) "
            f"VALUES ({sql_escape(code)}, {sql_escape(name)}, {sql_escape(fac)}, {dur});")
    add("")

    # -------- SEMESTERS --------
    add("-- ============================================================")
    add("-- SEMESTERS")
    add("-- ============================================================")
    for code, year, num, start, end in SEMESTERS:
        add(f"INSERT INTO semesters (Semester_Code, Academic_Year, Semester_Number, Start_Date, End_Date) "
            f"VALUES ({sql_escape(code)}, {year}, {num}, {sql_escape(start)}, {sql_escape(end)});")
    add("")

    # -------- MODULES --------
    add("-- ============================================================")
    add("-- MODULES")
    add("-- ============================================================")
    module_lookup = {}  # module_code -> dict
    for (code, name, prog, year, sem, credits, diff) in MODULES:
        desc = f"{name} — Year {year}, Semester {sem}"
        add(f"INSERT INTO modules (Module_Code, Module_Name, Module_Description, "
            f"Credit_Hours, Year_Level, Semester_Offered, Programme_Code) "
            f"VALUES ({sql_escape(code)}, {sql_escape(name)}, {sql_escape(desc)}, "
            f"{credits}, {year}, {sem}, {sql_escape(prog)});")
        module_lookup[code] = {
            'programme': prog,
            'year': year,
            'semester': sem,
            'difficulty': diff,
        }
    add("")

    # -------- STUDENTS --------
    add("-- ============================================================")
    add("-- STUDENTS")
    add("-- ============================================================")

    students = []
    used_names = set()

    # Distribute students across programmes
    # Weight BSC-CS and BBA-BA heavier to create realistic imbalance
    programme_weights = {
        'BSC-CS':  0.25,
        'BEN-CE':  0.15,
        'BBA-BA':  0.25,
        'BSC-MCS': 0.20,
        'BSC-PS':  0.15,
    }
    prog_codes = list(programme_weights.keys())
    prog_probs = list(programme_weights.values())

    for i in range(NUM_STUDENTS):
        # Unique student ID: start at 202300001, increment
        sid = 202300001 + i

        # Choose programme
        prog = random.choices(prog_codes, weights=prog_probs, k=1)[0]

        # Choose a unique name
        while True:
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            full = f"{first} {last}"
            if full not in used_names:
                used_names.add(full)
                break

        # Assign enrolment year: student could have started in 2023, 2024, or 2025
        # Distribute ~50% in 2023, 30% in 2024, 20% in 2025
        enrolment_year = random.choices([2023, 2024, 2025], weights=[0.5, 0.3, 0.2], k=1)[0]

        # Email
        email = f"{first.lower()}.{last.lower().replace(' ', '').replace(chr(39), '')}{sid % 1000:03d}@student.edu"

        # DOB: 18-24 years old in 2026
        age = random.randint(18, 24)
        dob = date(2026 - age, random.randint(1, 12), random.randint(1, 28))

        # Contact number: South African format
        contact = f"07{random.randint(10000000, 99999999)}"

        # Assign a "profile" (struggling / mainstream / excellent)
        # This dictates their mark distribution throughout their studies
        profile_roll = random.random()
        if profile_roll < PROFILE_STRUGGLING['weight']:
            profile = 'struggling'
        elif profile_roll < PROFILE_STRUGGLING['weight'] + PROFILE_EXCELLENT['weight']:
            profile = 'excellent'
        else:
            profile = 'mainstream'

        # Final status: based on enrolment year and random chance
        years_since_start = 2025 - enrolment_year
        if years_since_start >= 2:
            # Should have graduated by now
            status = random.choices(['Active', 'Graduated', 'Withdrawn'], weights=[0.5, 0.4, 0.1], k=1)[0]
        elif years_since_start == 1:
            status = random.choices(['Active', 'Graduated', 'Withdrawn'], weights=[0.85, 0.05, 0.10], k=1)[0]
        else:
            status = random.choices(['Active', 'Withdrawn'], weights=[0.95, 0.05], k=1)[0]

        students.append({
            'id': sid,
            'name': full,
            'dob': dob,
            'email': email,
            'contact': contact,
            'programme': prog,
            'enrolment_year': enrolment_year,
            'status': status,
            'profile': profile,
        })

        add(f"INSERT INTO students (Student_ID, Student_Name, Date_of_Birth, "
            f"Email_Address, Contact_Number, Programme_Code, Year_Enrolled, "
            f"Enrollment_Status, Password) VALUES "
            f"({sid}, {sql_escape(full)}, {sql_escape(dob)}, {sql_escape(email)}, "
            f"{sql_escape(contact)}, {sql_escape(prog)}, {enrolment_year}, "
            f"{sql_escape(status)}, {sql_escape('student123')});")

    add("")

    # -------- ENROLMENTS --------
    add("-- ============================================================")
    add("-- STUDENT ENROLMENTS")
    add("-- ============================================================")

    enrolment_id = 1
    total_enrolments = 0

    for student in students:
        sid = student['id']
        prog = student['programme']
        enrol_year = student['enrolment_year']
        profile = student['profile']

        # Determine the profile parameters
        if profile == 'struggling':
            base_mean, base_sd = PROFILE_STRUGGLING['mean'], PROFILE_STRUGGLING['sd']
            failure_bias = -8   # additional penalty
        elif profile == 'excellent':
            base_mean, base_sd = PROFILE_EXCELLENT['mean'], PROFILE_EXCELLENT['sd']
            failure_bias = 5    # slight bonus
        else:
            base_mean, base_sd = PROFILE_MAINSTREAM['mean'], PROFILE_MAINSTREAM['sd']
            failure_bias = 0

        # Determine which semesters the student took
        # They start in S{enrol_year}1 and progress semester-by-semester
        # up to a maximum of 6 semesters (or until their status ends)
        student_semesters = []
        for (sem_code, year, sem_num, _, _) in SEMESTERS:
            if year < enrol_year:
                continue
            if year == enrol_year and sem_num == 1 and enrol_year == 2025:
                # Students who start in 2025 S1 only have S1 available by year end
                pass
            student_semesters.append((sem_code, year, sem_num))
            if len(student_semesters) >= 6:
                break

        # For withdrawn students, stop earlier
        if student['status'] == 'Withdrawn':
            keep = max(1, int(len(student_semesters) * random.uniform(0.3, 0.7)))
            student_semesters = student_semesters[:keep]

        # For each semester, enrol in that programme's modules for that year level
        for sem_idx, (sem_code, year, sem_num) in enumerate(student_semesters):
            # Year level = how many years since start
            year_level = min(3, year - enrol_year + 1)

            # Find modules in this programme, year_level, semester_offered
            sem_modules = [
                (mc, meta) for mc, meta in module_lookup.items()
                if meta['programme'] == prog
                and meta['year'] == year_level
                and meta['semester'] == sem_num
            ]

            for (mod_code, meta) in sem_modules:
                # Skip a few modules randomly (students take electives)
                # But keep most
                if random.random() < 0.05:
                    continue

                # Calculate mark
                difficulty = meta['difficulty']
                # Slight downward drift as student progresses (harder years)
                year_penalty = (year_level - 1) * 2

                mark = random.gauss(
                    mu=base_mean + difficulty + failure_bias - year_penalty,
                    sigma=base_sd
                )
                mark = max(0, min(100, round(mark, 2)))

                # Determine grade
                grade = 'F'
                for boundary, letter in GRADE_BOUNDARIES:
                    if mark >= boundary:
                        grade = letter
                        break

                # Withdrawn students may have "Incomplete" — but for simplicity
                # we only record Completed. Non-returning semesters are simply absent.
                add(f"INSERT INTO student_enrollments (Enrollment_ID, Student_ID, "
                    f"Module_Code, Semester_Code, Mark_Obtained, Grade, "
                    f"Enrollment_Date, Status) VALUES "
                    f"({enrolment_id}, {sid}, {sql_escape(mod_code)}, {sql_escape(sem_code)}, "
                    f"{mark}, {sql_escape(grade)}, {sql_escape(date(year, sem_num * 6, 1))}, "
                    f"{sql_escape('Completed')});")
                enrolment_id += 1
                total_enrolments += 1

    # -------- FOOTER --------
    add("")
    add("SET FOREIGN_KEY_CHECKS = 1;")
    add("")
    add("-- ============================================================")
    add(f"-- Total: {len(students)} students, {total_enrolments} enrolments, {len(MODULES)} modules")
    add("-- ============================================================")

    # -------- WRITE FILE --------
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"\n[OK] Generated: {OUTPUT_FILE}")
    print(f"[OK] Students:   {len(students)}")
    print(f"[OK] Modules:    {len(MODULES)}")
    print(f"[OK] Enrolments: {total_enrolments}")

    # Profile breakdown
    from collections import Counter
    profiles = Counter(s['profile'] for s in students)
    print(f"[OK] Profiles:   {dict(profiles)}")

    # Grade breakdown preview
    print(f"\n[INFO] Run this to load: mysql -u root -p < \"{OUTPUT_FILE}\"")


if __name__ == "__main__":
    main()