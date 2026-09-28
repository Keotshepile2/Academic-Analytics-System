# APA-DSS — Technical Deep Dive

**Academic Performance Analytics & Decision Support System**

> Full technical documentation for APA-DSS. For the portfolio overview, see the
> [main README](../README.md). For a presentation-friendly walkthrough, open
> [`project-guide.html`](project-guide.html).

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Database Schema & Integration](#2-database-schema--integration)
3. [Data Flow](#3-data-flow)
4. [API Reference](#4-api-reference)
5. [SQL Analytics](#5-sql-analytics)
   - [Overall Pass Rate](#overall-pass-rate)
   - [Module Performance](#module-performance)
   - [Student Academic History](#student-academic-history)
6. [Machine Learning Pipeline](#6-machine-learning-pipeline)
   - [Problem Definition](#problem-definition)
   - [Feature Engineering](#feature-engineering)
   - [Logistic Regression](#logistic-regression)
   - [Training](#training)
   - [Evaluation](#evaluation)
   - [Prediction / Serving](#prediction--serving)
7. [Security Model](#7-security-model)
8. [Testing Strategy](#8-testing-strategy)
9. [Deployment Considerations](#9-deployment-considerations)
10. [Performance Notes](#10-performance-notes)
11. [Limitations & Responsible Use](#11-limitations--responsible-use)
12. [Future Improvements](#12-future-improvements)

---

## 1. System Architecture

APA-DSS follows a **layered, read-only architecture** built beside the existing
Student Record Management System (SRMS) — never modifying it.

![APA-DSS System Architecture](screenshots/07-architecture.png)

### Layer responsibilities

| Layer | Technology | Responsibility |
|---|---|---|
| **Presentation** | HTML5 · CSS3 · JavaScript · Chart.js | Render dashboards, tables, modals, and reports |
| **Application** | Node.js 18 · Express 4 | Authentication · Sessions · REST API · Orchestration |
| **Data** | MySQL 8 (read-only) | Source of truth for academic records |
| **Machine Learning** | Python 3.11 · scikit-learn | Feature engineering · Training · Scoring |

### Design decisions and trade-offs

| Decision | Reason | Trade-off |
|---|---|---|
| Read-only DB user (`apa_dss_user`) | Protects the SRMS from accidental modification | Analytics cannot cache results in the same DB |
| `child_process` for ML | No microservice overhead; simpler ops | Python cold-start adds ~1 s per invocation |
| Session-based authentication | Matches existing SMS admin model | Not stateless; requires a session store at scale |
| Chart.js via CDN | No build step; fast iteration | Larger client payload than a bundled chart library |
| Prepared statements everywhere | Prevent SQL injection; separate structure from data | Slightly more verbose query code |
| Same DB for SMS + analytics | Zero data duplication | Analytics queries share resources with operational load |

### Deployment topology (as built)

The current implementation runs entirely on a single developer machine:

```
┌────────────────────────────────────────────┐
│            Developer Machine                │
│                                             │
│  ┌──────────────┐   ┌──────────────────┐   │
│  │  Node.js     │   │  Python 3.11     │   │
│  │  Express     │──▶│  ML Pipeline     │   │
│  │  :3000       │   │  (venv)          │   │
│  └──────┬───────┘   └────────┬─────────┘   │
│         │                    │              │
│         │ mysql2             │ mysql-      │
│         │ (prepared)         │ connector   │
│         ▼                    ▼              │
│  ┌─────────────────────────────────────┐   │
│  │        MySQL 8 (localhost)          │   │
│  │        student_record_system        │   │
│  │        🟢 apa_dss_user (SELECT only) │   │
│  └─────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

---

## 2. Database Schema & Integration

### Tables consumed (read-only)

| Table | Primary Key | Purpose |
|---|---|---|
| `students` | `Student_ID` | Identity, programme, year enrolled, status |
| `modules` | `Module_Code` | Module metadata, credit hours, year level |
| `student_enrollments` | `Enrollment_ID` | Junction: student × module × semester + mark + grade |
| `programmes` | `Programme_Code` | Programme metadata, duration |
| `faculties` | `Faculty_Code` | Faculty metadata |
| `semesters` | `Semester_Code` | Academic year + semester definitions |
| `admins` | `Admin_ID` | Administrator authentication credentials |

### Data dictionary — key fields used by APA-DSS

| Field | Table | Type | Meaning |
|---|---|---|---|
| `Student_ID` | `students` | INT | Unique student identifier |
| `Student_Name` | `students` | VARCHAR | Student full name |
| `Programme_Code` | `students` | VARCHAR | Foreign key to `programmes` |
| `Year_Enrolled` | `students` | INT | Year the student enrolled |
| `Enrollment_Status` | `students` | VARCHAR | Active / Graduated / Withdrawn |
| `Module_Code` | `modules` | VARCHAR | Unique module identifier |
| `Module_Name` | `modules` | VARCHAR | Module name |
| `Credit_Hours` | `modules` | INT | Module credit weighting |
| `Year_Level` | `modules` | INT | Year level of the module (1–4) |
| `Semester_Offered` | `modules` | INT | Semester in which the module is normally offered |
| `Semester_Code` | `semesters` | VARCHAR | Unique semester identifier |
| `Academic_Year` | `semesters` | INT | Academic year |
| `Semester_Number` | `semesters` | INT | 1 or 2 |
| `Mark_Obtained` | `student_enrollments` | DECIMAL | Student mark (0–100) |
| `Grade` | `student_enrollments` | VARCHAR | Letter grade (A/B/C/D/F) |
| `Status` | `student_enrollments` | VARCHAR | Completed / Withdrawn / In-Progress |

### Entity relationships

```
faculties (1) ──< programmes (1) ──< modules
                        │
                        └──< students (1) ──< student_enrollments >── modules
                                                     │
                                                     └──> semesters
```

- One faculty has many programmes.
- One programme has many modules and many students.
- One student has many enrolments.
- One module is attempted by many students.
- One semester contains many enrolments.
- `student_enrollments` is the fact table at the centre of the star — every
  analytical query ultimately reads from it.

### Read-only database user setup

```sql
CREATE USER 'apa_dss_user'@'localhost'
  IDENTIFIED WITH mysql_native_password BY '<secure_password>';

GRANT SELECT ON student_record_system.* TO 'apa_dss_user'@'localhost';
FLUSH PRIVILEGES;
```

**Verify grants:**

```sql
SHOW GRANTS FOR 'apa_dss_user'@'localhost';
-- Expected:
--   GRANT USAGE ON *.* TO `apa_dss_user`@`localhost`
--   GRANT SELECT ON `student_record_system`.* TO `apa_dss_user`@`localhost`
```

**Verify read-only enforcement (should FAIL):**

```sql
-- Logged in as apa_dss_user:
USE student_record_system;
CREATE TABLE test_should_fail (id INT);
-- Expected: ERROR 1142 (42000): CREATE command denied
```

### Why `mysql_native_password`?

MySQL 8 defaults to `caching_sha2_password`, which the Node.js `mysql2` driver
supports but which requires additional TLS configuration in some environments.
`mysql_native_password` is simpler and reliable for local development.

### Connection pooling

The APA-DSS backend uses a dedicated connection pool separate from the SMS:

```javascript
// backend/config/db-apa.js
const apaPool = mysql.createPool({
  host: process.env.APA_DSS_DB_HOST,
  port: process.env.APA_DSS_DB_PORT,
  user: process.env.APA_DSS_DB_USER,
  password: process.env.APA_DSS_DB_PASSWORD,
  database: process.env.APA_DSS_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

**Why a separate pool?**

- **Isolation** — separates APA-DSS database connections from other application connections.
- **Credentials** — analytics always runs as `apa_dss_user`, never as `root`.
- **Least privilege** — the read-only role is enforced at the connection level.

---

## 3. Data Flow

### Analytics request lifecycle (KPI example)

```mermaid
flowchart LR
    DB[("MySQL<br/>student_enrollments")] -->|SELECT + aggregate| API["Node.js API<br/>/api/apa-dss/dashboard/kpis"]
    API -->|JSON| FE["Frontend<br/>dashboard.js"]
    FE -->|Chart.js| UI["📊 KPI Card"]
```

**Step by step:**

1. **Frontend** fetches `/api/apa-dss/dashboard/kpis` via `fetch()`.
2. **Express** routes the request to `dashboardController.getKpis()`.
3. **Controller** runs three parallel SQL queries via `apaPool.query()`.
4. **MySQL** executes each query in ~10–40 ms (indexed on key columns).
5. **Controller** shapes the three results into one JSON object.
6. **Express** serialises and returns with `Content-Type: application/json`.
7. **Frontend** updates the DOM and Chart.js instances.

**Typical total latency:** 80–150 ms round-trip on localhost.

### ML prediction lifecycle

```mermaid
flowchart LR
    DB[("MySQL")] -->|pandas read_sql| EXT["extract.py"]
    EXT -->|CSV| PRE["preprocess.py"]
    PRE -->|features| TRN["train.py<br/>LogisticRegression.fit"]
    TRN -->|joblib| PKL["logistic_regression.pkl"]
    PKL -->|predict.py| SCORE["Risk scores + top factors"]
    SCORE -->|JSON via stdout| NODE["Node.js<br/>mlService.js"]
    NODE -->|JSON| FE["Frontend<br/>at-risk.js"]
```

**Step by step:**

1. **`extract.py`** — pulls 10,606 enrollment rows into a pandas DataFrame.
2. **`preprocess.py`** — engineers per-student features; writes `features.csv`.
3. **`train.py`** — splits 80/20, scales features, fits Logistic Regression,
   serialises the model and scaler with joblib.
4. **`predict.py`** — loads the model, scores every student, computes top-4
   feature contributions per student, prints JSON to stdout.
5. **`mlService.js`** — Node.js `child_process.execFile()` captures stdout and
   parses it as JSON.
6. **Frontend** renders risk scores, risk bands, and per-student factors.

### Why this architecture?

- **Two languages, one pipeline.** Node handles HTTP and sessions; Python
  handles numerical work. Each stays in its native ecosystem.
- **Read-only by construction.** The DB user itself enforces read-only — no
  application-level guard needed.
- **No caching layer (yet).** For 600 students and 118 modules, live queries
  are fast enough. Caching is on the roadmap for scale.

---

## 4. API Reference

All endpoints live under `/api`. Analytics endpoints require an authenticated
session; `401 Unauthorized` is returned otherwise.

### Authentication

| Method | Endpoint | Body / Params | Response |
|---|---|---|---|
| `POST` | `/api/auth/login` | `{ email, password }` | `{ success, admin, redirect }` |
| `POST` | `/api/auth/logout` | — | `{ success, redirect }` |
| `GET` | `/api/auth/me` | — | `{ authenticated, admin }` |
| `GET` | `/api/auth/check` | — | `{ authenticated }` |

### Dashboard

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/apa-dss/dashboard/kpis` | 6 headline KPIs |
| `GET` | `/api/apa-dss/dashboard/trends` | GPA trend by semester |
| `GET` | `/api/apa-dss/dashboard/grade-distribution` | A/B/C/D/F distribution |
| `GET` | `/api/apa-dss/dashboard/progression` | Proceed / Repeat / At-Risk / Excluded |
| `GET` | `/api/apa-dss/dashboard/failure-hotspots` | Bubble chart data |
| `GET` | `/api/apa-dss/dashboard/risk-summary` | At-risk count per programme |

### Students

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/apa-dss/students` | Paginated list + filters (`?programme=&faculty=&semester=&year=`) |
| `GET` | `/api/apa-dss/students/:id` | Full student drill-down |
| `GET` | `/api/apa-dss/students/:id/progression` | Semester-by-semester progression |

### Modules

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/apa-dss/modules` | Module performance table |
| `GET` | `/api/apa-dss/modules/:code` | Module detail (rank, difficulty index, distribution) |
| `GET` | `/api/apa-dss/modules/top` | Top 5 by pass rate |
| `GET` | `/api/apa-dss/modules/bottom` | Bottom 5 by pass rate |

### Programmes & Faculties

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/apa-dss/programmes` | Programme list with metrics |
| `GET` | `/api/apa-dss/programmes/:code` | Programme detail |
| `GET` | `/api/apa-dss/faculties` | Faculty list with metrics |
| `GET` | `/api/apa-dss/faculties/:code` | Faculty detail |

### At-Risk (ML)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/apa-dss/at-risk/students` | All students scored by ML |
| `GET` | `/api/apa-dss/at-risk/model-info` | Model Card (algorithm, metrics, features) |
| `POST` | `/api/apa-dss/at-risk/predict` | Trigger ML pipeline rerun |

### Example response — `/api/apa-dss/dashboard/kpis`

```json
{
  "total_students": 600,
  "total_programmes": 12,
  "total_modules": 118,
  "pass_rate": 74.2,
  "avg_mark": 62.8,
  "at_risk_count": 182
}
```

### Error responses

| Code | Meaning | Example |
|---|---|---|
| `400` | Bad request | Missing email or password on login |
| `401` | Unauthorized | No session, or invalid credentials |
| `404` | Not found | Unknown student ID or module code |
| `500` | Server error | Database unreachable, ML script failed |

---

## 5. SQL Analytics

APA-DSS calculates every KPI with hand-written SQL. All queries use prepared
statements and run against the read-only `apa_dss_user`.

### Overall Pass Rate

**Purpose:** Headline KPI on the dashboard — percentage of completed enrollments
with a non-fail grade.

```sql
SELECT
  ROUND(
    (
      SUM(CASE WHEN Grade != 'F' AND Grade IS NOT NULL THEN 1 ELSE 0 END)
      / NULLIF(COUNT(CASE WHEN Grade IS NOT NULL THEN 1 END), 0)
    ) * 100,
    2
  ) AS pass_rate
FROM student_enrollments
WHERE Status = 'Completed';
```

**Notes:**

- `NULLIF(..., 0)` guards against division-by-zero if no graded enrollments exist.
- `Status = 'Completed'` excludes withdrawn or in-progress enrollments.
- Rows with `NULL` grade are excluded from both numerator and denominator.
- `ROUND(..., 2)` keeps the display clean.

**Consumed by:** `/api/apa-dss/dashboard/kpis` → KPI card "Pass Rate"

---

### Module Performance

**Purpose:** Powers the dashboard's Top 5 / Bottom 5 module charts and the
module detail modal (rank, difficulty index, mark distribution).

#### Top / Bottom modules by pass rate

```sql
SELECT
  m.Module_Code,
  m.Module_Name,
  COUNT(se.Enrollment_ID) AS total_enrolments,
  SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) AS passed,
  ROUND(AVG(se.Mark_Obtained), 2) AS avg_mark,
  ROUND(
    (
      SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END)
      / NULLIF(COUNT(CASE WHEN se.Grade IS NOT NULL THEN 1 END), 0)
    ) * 100,
    2
  ) AS pass_rate
FROM modules m
LEFT JOIN student_enrollments se
  ON m.Module_Code = se.Module_Code
 AND se.Status = 'Completed'
GROUP BY m.Module_Code, m.Module_Name
ORDER BY pass_rate ASC;
```

**Notes:**

- The `AND se.Status = 'Completed'` condition is part of the **JOIN**, not the
  `WHERE` clause. This is deliberate: it preserves modules that have **zero**
  completed enrollments (they will show `NULL`/0 counts), which is useful
  data-quality information.
- Sort ascending for "worst performing first"; reverse for top performers.

#### Mark distribution histogram (per module)

```sql
SELECT
  FLOOR(Mark_Obtained / 10) * 10 AS bucket,
  COUNT(*) AS students
FROM student_enrollments
WHERE Module_Code = ?
  AND Mark_Obtained IS NOT NULL
GROUP BY bucket
ORDER BY bucket;
```

**Notes:**

- Buckets marks into 10-point bins (0–9, 10–19, …, 90–100).
- Frontend renders these as a histogram.

**Consumed by:** `/api/apa-dss/modules` and `/api/apa-dss/modules/:code`

---

### Student Academic History

**Purpose:** Powers the student drill-down modal — marks history chart,
failed-modules list, and progression timeline.

#### Full academic history

```sql
SELECT
  s.Student_ID,
  s.Student_Name,
  se.Module_Code,
  m.Module_Name,
  se.Mark_Obtained,
  se.Grade,
  se.Semester_Code,
  sem.Academic_Year,
  sem.Semester_Number
FROM students s
JOIN student_enrollments se ON s.Student_ID = se.Student_ID
JOIN modules m ON se.Module_Code = m.Module_Code
JOIN semesters sem ON se.Semester_Code = sem.Semester_Code
WHERE s.Student_ID = ?
ORDER BY sem.Academic_Year, sem.Semester_Number;
```

**Notes:**

- Parameterised on `Student_ID` — no string concatenation.
- Ordered chronologically so the frontend can chart marks over time.
- Includes grade and mark so both the chart and the failed-modules list are
  driven by one query.

#### Class rank within programme

```sql
SELECT
  s.Student_ID,
  s.Student_Name,
  ROUND(AVG(se.Mark_Obtained), 2) AS student_avg,
  RANK() OVER (
    PARTITION BY s.Programme_Code
    ORDER BY AVG(se.Mark_Obtained) DESC
  ) AS rank_in_programme
FROM students s
JOIN student_enrollments se ON s.Student_ID = se.Student_ID
WHERE se.Mark_Obtained IS NOT NULL
GROUP BY s.Student_ID, s.Student_Name, s.Programme_Code;
```

**Notes:**

- `PARTITION BY s.Programme_Code` restricts the rank to students **within the
  same programme** — this is programme rank, not university-wide rank.
- Ties share the same rank — standard academic convention.

**Consumed by:** `/api/apa-dss/students/:id` and `/api/apa-dss/students/:id/progression`

---

## 6. Machine Learning Pipeline

### Problem Definition

**Objective:** Demonstrate an interpretable ML-based classification pipeline
for identifying students associated with recent academic risk, with the
longer-term goal of developing a validated early-warning model.

**Target definition (as implemented):**

> A student is classified as **At-Risk** if they failed **≥ 50%** of the modules
> they attempted in their most recently completed semester.

**Class distribution:** 182 at-risk (30.3%) · 418 not-at-risk (69.7%)

The 30/70 split is imbalanced — so training uses `class_weight='balanced'`.

#### ⚠️ Important methodological note

The current target is constructed from **recent-semester academic performance**.
Because some recent-semester features (e.g., `failed_last_sem`,
`failure_rate_last_sem`) are also used as predictors, the current
implementation should be interpreted as a **demonstration of classification and
ML integration**, rather than a validated future-risk prediction model.

A production early-warning model would require **strict temporal separation**
between predictor data and future outcomes (e.g., predict next-semester
performance using only information available *before* that semester begins).
This is listed under [Future Improvements](#12-future-improvements).

---

### Feature Engineering

Features are constructed at the **student level** by aggregating enrollment
records across all semesters.

| # | Feature | Type | Source | Description |
|---|---|---|---|---|
| 1 | `avg_mark` | numeric | `student_enrollments` | Mean mark across all modules |
| 2 | `num_modules` | integer | `student_enrollments` | Total modules attempted |
| 3 | `gpa` | numeric | derived | Estimated GPA (see below) |
| 4 | `year_level` | integer | `students` | Student's year level, derived from enrolment year and current year |
| 5 | `total_credits` | integer | `modules` | Sum of credit hours attempted |
| 6 | `num_failed` | integer | `student_enrollments` | Count of `Grade = 'F'` |
| 7 | `failure_rate` | numeric | derived | `num_failed / num_modules` |
| 8 | `avg_mark_last_sem` | numeric | `student_enrollments` | **Mean** mark across all modules in the most recent semester |
| 9 | `total_last_sem` | integer | `student_enrollments` | Modules attempted in the most recent semester |
| 10 | `failed_last_sem` | integer | `student_enrollments` | Failures in the most recent semester |
| 11 | `failure_rate_last_sem` | numeric | derived | `failed_last_sem / total_last_sem` |
| 12 | `declining_trend` | binary | derived | `1` if avg mark declining across the last 3 semesters |

#### GPA mapping

Grade point values used by the pipeline:

| Grade | Grade point |
|---|---|
| A | 4.0 |
| B | 3.0 |
| C | 2.0 |
| D | 1.0 |
| F | 0.0 |

`gpa` is computed as the **simple (unweighted) mean of grade points** across
all completed modules. A credit-weighted GPA is on the roadmap.

#### `declining_trend` calculation

`declining_trend` is set to `1` when a student's per-semester average mark has
**decreased across three consecutive semesters**, otherwise `0`.

Example:

```
Semester 1 average: 72
Semester 2 average: 68
Semester 3 average: 61
72 > 68 > 61  →  declining_trend = 1
```

Students with fewer than three completed semesters are assigned `0`.

#### `year_level` — how it is derived

`year_level` is derived from the student's **enrolment year**, not from the
module's year level. Specifically:

```
year_level = current_academic_year - Year_Enrolled + 1
```

This distinguishes the student's progression stage (1st year, 2nd year, …) from
`modules.Year_Level`, which describes the year level of an individual module.

**Sample code — engineering the core features:**

```python
# 1. Find each student's most recent semester
last_semester = (
    df.groupby('Student_ID')['Semester_Code']
      .max()
      .reset_index()
      .rename(columns={'Semester_Code': 'last_semester'})
)

# 2. Keep only records from that semester
last_sem_records = df.merge(last_semester, on='Student_ID')
last_sem_records = last_sem_records[
    last_sem_records['Semester_Code'] == last_sem_records['last_semester']
]

# 3. Aggregate recent-semester features — note the MEAN, not last value
last_sem_features = last_sem_records.groupby('Student_ID').agg(
    avg_mark_last_sem = ('Mark_Obtained', 'mean'),
    total_last_sem    = ('Module_Code',   'count'),
    failed_last_sem   = ('Grade', lambda x: (x == 'F').sum()),
).reset_index()

# 4. Derive failure rate for last semester
last_sem_features['failure_rate_last_sem'] = (
    last_sem_features['failed_last_sem']
    / last_sem_features['total_last_sem']
)

# 5. Aggregate overall features
features = df.groupby('Student_ID').agg(
    avg_mark    = ('Mark_Obtained', 'mean'),
    num_modules = ('Module_Code',   'count'),
    num_failed  = ('Grade', lambda x: (x == 'F').sum()),
).reset_index()

features['failure_rate'] = features['num_failed'] / features['num_modules']

# 6. Merge recent-semester features back in
features = features.merge(last_sem_features, on='Student_ID', how='left')
```

**Why these features?**

- **Direct performance signals** — `avg_mark`, `num_failed`, `failure_rate`.
- **Recency signals** — the `*_last_sem` family captures current trajectory.
- **Trajectory signals** — `declining_trend` detects worsening performance.
- **Context signals** — `year_level`, `total_credits` control for stage of study.

**Why not more features?**

Small dataset (~600 students). More features → higher overfitting risk. Feature
selection was deliberately conservative.

---

### Logistic Regression

Logistic Regression was selected as the **initial interpretable baseline**.
Key properties:

| Property | Benefit |
|---|---|
| **Linear decision boundary** | Coefficients are interpretable |
| **Sigmoid output** | Produces probability estimates between 0 and 1 |
| **L2 regularization** | Reduces overfitting risk on small data |
| **Fast model fitting** | Model fitting is quick on this dataset, enabling frequent retraining |
| **Well understood** | Every prediction traceable to feature contributions |

> **Note on probability calibration:** A sigmoid output produces values in
> [0, 1], but this does **not** automatically mean the probabilities are
> *calibrated*. Calibration testing (reliability curves, Brier score) was not
> performed for this project and is listed under Future Improvements.

**The model in one equation:**

```
p(at_risk) = σ(w₁x₁ + w₂x₂ + ... + wₙxₙ + b)
```

where:

- `xᵢ` are the engineered features,
- `wᵢ` are the learned coefficients,
- `b` is the bias,
- `σ(z) = 1 / (1 + e^(−z))` is the sigmoid function.

**Pseudocode for prediction:**

```
FUNCTION predict_at_risk(student_features):
    z ← w₁·x₁ + w₂·x₂ + ... + wₙ·xₙ + b
    p ← 1 / (1 + e^(−z))
    RETURN p, top_factors(w, x)
END FUNCTION
```

**Interpretability in action:**

- The **sign** of `wᵢ` tells direction: positive → associated with higher risk.
- The **magnitude** of `wᵢ · xᵢ` tells how much that feature contributed to *this*
  student's prediction — this is what the UI shows as "top risk factors."

**Why not Random Forest / XGBoost?**

These models were not selected as the initial baseline because the project
prioritises **interpretability, simple deployment, and reproducibility** on a
relatively small dataset. They can be evaluated against Logistic Regression in
future experiments.

---

### Training

**Split:** 80% train (480 students) / 20% test (120 students), stratified by
target to preserve the 30/70 class ratio.

**Scaling:** `StandardScaler` — features like `total_credits` (up to ~500) and
`failure_rate` (0–1) would otherwise have wildly different scales and hinder
gradient descent.

```python
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib

# 1. Split — stratified to preserve class balance
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# 2. Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

# 3. Train with class balancing
model = LogisticRegression(
    class_weight='balanced',
    max_iter=1000,
    random_state=42
)
model.fit(X_train_scaled, y_train)

# 4. Persist model + scaler for inference
joblib.dump(model,  'models/logistic_regression.pkl')
joblib.dump(scaler, 'models/scaler.pkl')
```

**Key parameter choices:**

| Parameter | Value | Why |
|---|---|---|
| `class_weight` | `'balanced'` | Compensates for 30/70 class imbalance |
| `max_iter` | `1000` | Ensures convergence on this dataset |
| `random_state` | `42` | Reproducibility |
| `test_size` | `0.2` | Standard held-out split for small data |

#### Reproducibility

| Item | Value |
|---|---|
| Python | 3.11 |
| pandas | *(pin your actual version)* |
| NumPy | *(pin your actual version)* |
| scikit-learn | *(pin your actual version)* |
| joblib | *(pin your actual version)* |
| `random_state` | 42 |
| Train/test split | 80 / 20, stratified |
| Cross-validation | 5-fold, stratified |

`requirements.txt` should pin exact versions so results are reproducible.

---

### Evaluation

**Test set: 120 held-out students (36 at-risk, 84 not-at-risk)**

| Metric | Value | Interpretation |
|---|---:|---|
| **Accuracy** | 93.3% | Overall correctness |
| **Precision** | 85.0% | Of flagged students, 85% truly at-risk |
| **Recall** | 94.4% | Of all at-risk students, 94% were caught |
| **F1-Score** | 89.5% | Harmonic mean of precision & recall |
| **AUC-ROC** | 98.6% | Class separation (as measured) |

**Confusion matrix:**

```
                    Predicted
                Not At-Risk  At-Risk
Actual
Not At-Risk         78         6
At-Risk              2        34
```

**5-fold cross-validation (more reliable):**

| Metric | Value |
|---|---:|
| CV Accuracy | 91.0% ± 1.7% |
| CV Precision | 83.2% ± 3.2% |
| CV Recall | 88.5% ± 5.0% |
| CV F1-Score | 85.6% ± 2.8% |

**Why both?**

- Test set is small (120) — a single split is less trustworthy.
- Cross-validation averages across 5 splits — more stable.
- The CV numbers are the ones to quote in the defence.

**Feature coefficients (learned weights):**

| Feature | Coefficient | Direction |
|---|---:|---|
| `avg_mark_last_sem` | −4.17 | ↓ decreases risk |
| `failure_rate` | +1.83 | ↑ increases risk |
| `avg_mark` | +1.23 | ↑ increases risk |
| `year_level` | +1.12 | ↑ increases risk |
| `num_modules` | −1.07 | ↓ decreases risk |
| `num_failed` | +0.98 | ↑ increases risk |
| `gpa` | +0.60 | ↑ increases risk |
| `declining_trend` | −0.19 | ↓ decreases risk |

The strongest predictor is `avg_mark_last_sem` — recent performance dominates,
which is consistent with the target definition.

> ⚠️ **Reminder:** These metrics were computed on **synthetic training data**.
> They validate that the pipeline is implemented and evaluated correctly; they
> do **not** establish real-world predictive performance.

---

### Prediction / Serving

**`predict.py`** — invoked by Node.js on demand and run as a subprocess:

```python
import joblib, json
import pandas as pd

model  = joblib.load('models/logistic_regression.pkl')
scaler = joblib.load('models/scaler.pkl')

features = pd.read_csv('data/features.csv')
X = features[FEATURE_COLS].values
X_scaled = scaler.transform(X)

probs = model.predict_proba(X_scaled)[:, 1]
coefs = model.coef_[0]

results = []
for i, student in enumerate(features.itertuples()):
    contributions = sorted(
        zip(FEATURE_COLS, coefs * X_scaled[i]),
        key=lambda x: abs(x[1]),
        reverse=True
    )[:4]

    results.append({
        'student_id': int(student.Student_ID),
        'student_name': student.student_name,
        'risk_probability': float(probs[i]),
        'risk_band': (
            'HIGH'    if probs[i] >= 0.75 else
            'AT_RISK' if probs[i] >= 0.50 else
            'MONITOR' if probs[i] >= 0.30 else
            'ON_TRACK'
        ),
        'top_factors': [
            {'feature': f, 'impact': round(v, 3)} for f, v in contributions
        ]
    })

print(json.dumps(results))
```

**Called from Node.js:**

```javascript
function runPrediction() {
  return new Promise((resolve, reject) => {
    const python = process.env.PYTHON_ENV_PATH
      ? path.join(process.env.PYTHON_ENV_PATH, 'Scripts', 'python.exe')
      : 'python';

    execFile(python, ['models/predict.py'], { cwd: 'ml-pipeline' },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr || error.message));
        try { resolve(JSON.parse(stdout)); }
        catch (e) { reject(new Error('Invalid JSON from ML script')); }
      });
  });
}
```

#### Project-defined UI risk bands

| Band | Probability | UI meaning |
|---|---|---|
| 🔴 HIGH | ≥ 0.75 | Priority advisor review |
| 🟠 AT_RISK | 0.50 – 0.74 | Advisor review |
| 🟡 MONITOR | 0.30 – 0.49 | Monitor next semester |
| 🟢 ON_TRACK | < 0.30 | No action needed |

> These thresholds are **project-defined** and used for presentation purposes
> only. They are not statistically validated and should be reviewed against
> institutional outcomes before any operational use. The bands do **not** imply
> that the underlying probabilities are calibrated.

---

## 7. Security Model

| Layer | Control |
|---|---|
| **Database** | Dedicated `apa_dss_user` with `SELECT`-only grants |
| **Queries** | Prepared statements everywhere — no string concatenation |
| **Secrets** | `.env` excluded from Git via `.gitignore`; `.env.example` documents required variables |
| **Session** | Server-side sessions · `httpOnly` cookies · `sameSite=lax` |
| **Auth** | Admin credentials checked against the `admins` table; user input validated with a regex on email |
| **HTTPS** | `cookie.secure = true` when `NODE_ENV=production` |
| **Input** | Email validation on login; parameterized SQL everywhere |

### Known security gaps (documented deliberately)

- ⚠️ **Password handling** is inherited from the existing SMS authentication
  system and has **not** been migrated to a modern password-hashing scheme
  within APA-DSS. (See [Limitations](#11-limitations--responsible-use).)
- ⚠️ **No rate limiting** on the login endpoint — should add `express-rate-limit`
  for production.
- ⚠️ **No CSRF token** — state-changing endpoints should be CSRF-protected in
  production.

These are documented as known limitations rather than ignored.

---

## 8. Testing Strategy

### Manual verification matrix

| # | Test | Expected | Result |
|---|---|---:|---:|
| 1 | DB connection (read-only) | Selects succeed, writes blocked | ✅ |
| 2 | Login — valid credentials | Session created, redirect to dashboard | ✅ |
| 3 | Login — invalid credentials | `401`, error message shown, password cleared | ✅ |
| 4 | Protected route without session | Redirect to `/apa-dss/login` | ✅ |
| 5 | Protected API without session | `401 Unauthorized` JSON | ✅ |
| 6 | Dashboard KPIs load | 6 KPIs match manual SQL | ✅ |
| 7 | Dashboard filters | KPIs + charts update correctly | ✅ |
| 8 | Student search | Matching rows returned | ✅ |
| 9 | Student modal | Rank, chart, comparisons, failed list shown | ✅ |
| 10 | Module detail modal | Rank, difficulty, trend, histogram, bottom-5 | ✅ |
| 11 | ML predictions | Risk score + top factors per student | ✅ |
| 12 | ML retrain button | Pipeline reruns, metrics update | ✅ |
| 13 | CSV export | Valid CSV downloaded | ✅ |
| 14 | Print / PDF report | Browser print dialog renders cleanly | ✅ |
| 15 | SQL injection attempt | Rejected (prepared statements) | ✅ |

### Data validation approach

- **Spot-check method:** dashboard values compared against direct SQL queries
  for 5 different KPIs.
- **Consistency checks:** pass rate + fail rate = 100%; total enrolments match
  the sum across modules.
- **Edge cases tested:** student with 0 completed semesters; student with 100%
  failure rate; module with 0 enrollments.

---

## 9. Deployment Considerations

The current implementation is **development-only**. For institutional deployment:

| Requirement | Reason |
|---|---|
| Hosted MySQL (AWS RDS for MySQL / Azure Database for MySQL / DigitalOcean Managed MySQL) | Local DB is not accessible remotely |
| HTTPS certificate | Session cookies require `secure=true` |
| Secrets manager (AWS Secrets Manager, Vault) | `.env` files are not suitable for production |
| Process manager (PM2 / systemd) | Auto-restart on crash |
| Reverse proxy (Nginx / Caddy) | TLS termination · rate limiting · static caching |
| Backups | Daily snapshots of the SRMS database |
| Audit logging | Support accountability and investigation of access to sensitive academic data |
| Password hashing migration | Migrate admin credentials away from the current inherited scheme |
| RBAC | Restrict analytics by faculty/programme |
| Rate limiting | Protect auth and ML-retrain endpoints |

### Full setup guide

See the **[Quick Start](../README.md#-quick-start)** in the README for a
5-minute setup. The extended steps below cover deployment-grade installation.

#### Prerequisites — detailed

| Requirement | Minimum | Verify with |
|---|---|---|
| Node.js | 18 LTS or newer | `node --version` |
| npm | 9+ | `npm --version` |
| MySQL | 8.0 or newer | `mysql --version` |
| Python | 3.10 or newer | `python --version` |
| Git | 2.30+ | `git --version` |

#### Extended setup

1. **Clone and install**

   ```bash
   git clone https://github.com/Keotshepile2/Academic-Analytics-System.git
   cd Academic-Analytics-System
   npm install
   ```

2. **Import the database**

   ```bash
   mysql -u root -p < database/Dump20260823.sql
   ```

   Verify:

   ```sql
   USE student_record_system;
   SELECT COUNT(*) FROM students;              -- expect 600
   SELECT COUNT(*) FROM student_enrollments;   -- expect 10,606
   ```

3. **Create the read-only user** (see §2 for full detail).

4. **Configure `.env`** — every variable documented in §2.

   **Generating a strong session secret:**

   ```bash
   # macOS / Linux
   openssl rand -base64 32
   ```

   ```powershell
   # Windows (PowerShell)
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
   ```

5. **Set up Python**

   ```bash
   cd ml-pipeline
   python -m venv venv
   venv\Scripts\activate      # Windows
   # source venv/bin/activate # macOS / Linux
   pip install -r requirements.txt
   ```

6. **Train the model**

   ```bash
   python data/extract.py        # 10–20 s — pulls 10,606 rows
   python data/preprocess.py     # 2–5 s — engineers features
   python models/train.py        # 3–5 s — trains and saves model
   python models/evaluate.py     # 2–3 s — prints metrics
   deactivate
   cd ..
   ```

7. **Run**

   ```bash
   npm start
   ```

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Access denied for user 'apa_dss_user'` | Wrong password in `.env` | Recreate user with the exact password |
| `Access denied for user 'root'` | Wrong root password | Update `DB_PASSWORD` in `.env` |
| `ER_NOT_SUPPORTED_AUTH_MODE` | MySQL 8 caching_sha2 | Recreate user with `mysql_native_password` |
| `ECONNREFUSED` | MySQL not running | Start MySQL service |
| `Unknown database 'student_record_system'` | DB not imported | Re-import the dump |
| `Cannot find module 'express'` | `npm install` didn't run | Run `npm install` |
| `ModuleNotFoundError: pandas` | venv not activated | Activate venv |
| `python: command not found` | Python not on PATH | Install Python or use full path |
| ML script times out | Slow machine | Increase timeout in `mlService.js` |
| Login fails despite correct password | Admin row wrong | `SELECT * FROM admins;` |

---

## 10. Performance Notes

| Operation | Typical latency | Notes |
|---|---:|---|
| Dashboard KPI query set | 80–150 ms | 3 parallel SQL queries |
| Student list (paginated 50) | 40–80 ms | Indexed on `Student_ID` |
| Module detail | 60–120 ms | Multiple joins + aggregations |
| ML prediction (all students) | 800–1,500 ms | Python cold-start + inference |
| ML full pipeline (extract + features + fit + evaluate) | 4–8 s | Model fitting itself is sub-second; the total includes data extraction and preprocessing |

### Optimizations applied

- **Connection pooling** — 10 connections shared across requests.
- **Prepared statements** — protect against SQL injection and separate query
  structure from user-supplied values.
- **`Promise.all()`** — independent dashboard queries run in parallel.
- **Indexes** on foreign keys and filter columns.

### Potential optimizations (roadmap)

- **Materialized views** for frequently accessed KPIs.
- **Redis cache** for dashboard responses (5-minute TTL).
- **Persistent Python process** (Flask / FastAPI) — avoid cold-start per request.
- **Server-side pagination** for large student lists.

---

## 11. Limitations & Responsible Use

APA-DSS is a **decision-support tool**, not an automated decision system. The
following limitations are documented deliberately.

### Data limitations

- **Synthetic training data.** ML metrics validate pipeline correctness, not
  real-world prediction quality.
- **No real institutional validation.** Historical data would be required to
  confirm usefulness.
- **Local database.** The MySQL instance runs on the developer's machine and is
  not reachable remotely.

### Model limitations

- **No strict temporal separation.** The target is constructed from
  recent-semester performance, and some of that performance is also used as
  features. The current implementation should be read as a **classification
  demonstration**, not a validated future-risk prediction model.
- **Small training set.** 600 students is enough for Logistic Regression, but
  limits model complexity.
- **Binary target.** The 50%-failure rule is a simplification; real risk is
  continuous.
- **Uncalibrated probabilities.** Sigmoid outputs lie in [0, 1] but were not
  calibrated against observed outcomes.
- **Project-defined risk bands.** The HIGH / AT_RISK / MONITOR / ON_TRACK
  thresholds are UI labels, not statistically validated cut-offs.

### Ethical considerations

- **Human in the loop.** Every prediction is presented as a *suggestion*, never
  an automated verdict. Academic staff remain the decision-makers.
- **Explainability.** Every risk flag comes with the top contributing features,
  so advisors can see *why* a student was flagged.
- **POPIA / data-protection considerations.** Real student data must not be
  deployed without appropriate institutional review. APA-DSS includes
  privacy-aligned design choices (read-only access, session-based authentication,
  no data duplication), but institutional compliance involves organisational
  and legal requirements beyond the application itself.

### Security limitations

- Password handling is inherited from the existing SMS authentication system
  and has not been migrated to a modern password-hashing scheme within APA-DSS.
- No rate limiting on auth endpoints.
- No CSRF protection.

### Deployment limitations

- Not deployed institutionally.
- Requires hosted DB, HTTPS, hardened auth, audit logging, and POPIA /
  data-protection review before production use.

---

## 12. Future Improvements

### Short-term (weeks)

- ☁️ **Cloud deployment** — AWS RDS for MySQL / Azure Database for MySQL /
  DigitalOcean Managed MySQL for the DB; Render / Railway / Fly.io for the app.
- 🔐 **Password hashing** — migrate to bcrypt or argon2 (with a migration path
  that preserves existing SMS logins).
- ⚡ **Persistent ML service** — replace `child_process` with a small FastAPI
  container or a long-lived Node ↔ Python bridge.

### Medium-term (months)

- 🎯 **Temporally separated prediction target** — predict whether a student
  will experience academic difficulty in the **next semester**, using only
  information available *before* that semester begins.
- 📊 **Probability calibration** — add reliability curves, Brier score, and
  calibration error analysis; consider Platt scaling or isotonic regression.
- 👥 **Role-based access control** — restrict analytics by faculty or programme.
- 📧 **Automated alerts** — email advisors when a student crosses a risk
  threshold.
- 🧠 **Model comparison** — evaluate Random Forest, XGBoost, and Neural
  Networks against the Logistic baseline.
- 📈 **Time-series forecasting** — predict next-semester performance using
  historical trajectories.
- 📱 **Mobile companion app** — native iOS / Android for advisors.

### Long-term (research)

- 🗄 **Data warehouse** — materialized views and columnar storage for scale.
- 🌍 **Multi-institution schema abstraction** — make APA-DSS deployable to any
  SRMS.
- 🔬 **Real-data validation** — collaborate with an institution to validate the
  model on actual historical records.
- 🧪 **Causal modelling** — move from correlation ("this predicts risk") to
  causation ("this intervention reduces risk").

---

## Related documentation

- [Main README](../README.md) — portfolio overview
- [Project Guide](project-guide.html) — presentation walkthrough
- [Screenshots](screenshots/) — annotated UI captures

---

*Last updated: 2026 · Sol Plaatje University · Mini-Capstone Project*
