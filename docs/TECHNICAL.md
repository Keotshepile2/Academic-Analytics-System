\# APA-DSS — Technical Deep Dive



\*\*Academic Performance Analytics \& Decision Support System\*\*



> Full technical documentation for APA-DSS. For the portfolio overview, see the

> \[main README](../README.md). For a presentation-friendly walkthrough, open

> \[`project-guide.html`](project-guide.html).



\---



\## Table of Contents



1\. \[System Architecture](#1-system-architecture)

2\. \[Database Schema \& Integration](#2-database-schema--integration)

3\. \[Data Flow](#3-data-flow)

4\. \[API Reference](#4-api-reference)

5\. \[SQL Analytics](#5-sql-analytics)

&#x20;  - \[Overall Pass Rate](#overall-pass-rate)

&#x20;  - \[Module Performance](#module-performance)

&#x20;  - \[Student Academic History](#student-academic-history)

6\. \[Machine Learning Pipeline](#6-machine-learning-pipeline)

&#x20;  - \[Problem Definition](#problem-definition)

&#x20;  - \[Feature Engineering](#feature-engineering)

&#x20;  - \[Logistic Regression](#logistic-regression)

&#x20;  - \[Training](#training)

&#x20;  - \[Evaluation](#evaluation)

&#x20;  - \[Prediction / Serving](#prediction--serving)

7\. \[Security Model](#7-security-model)

8\. \[Testing Strategy](#8-testing-strategy)

9\. \[Deployment Considerations](#9-deployment-considerations)

10\. \[Performance Notes](#10-performance-notes)

11\. \[Limitations \& Responsible Use](#11-limitations--responsible-use)

12\. \[Future Improvements](#12-future-improvements)



\---



\## 1. System Architecture



APA-DSS follows a \*\*layered, read-only architecture\*\* built beside the existing

Student Record Management System (SRMS) — never modifying it.



!\[APA-DSS System Architecture](screenshots/07-architecture.png)



\### Layer responsibilities



| Layer | Technology | Responsibility |

|---|---|---|

| \*\*Presentation\*\* | HTML5 · CSS3 · JavaScript · Chart.js | Render dashboards, tables, modals, and reports |

| \*\*Application\*\* | Node.js 18 · Express 4 | Authentication · Sessions · REST API · Orchestration |

| \*\*Data\*\* | MySQL 8 (read-only) | Source of truth for academic records |

| \*\*Machine Learning\*\* | Python 3.11 · scikit-learn | Feature engineering · Training · Scoring |



\### Design decisions and trade-offs



| Decision | Reason | Trade-off |

|---|---|---|

| Read-only DB user (`apa\_dss\_user`) | Protects the SRMS from accidental modification | Analytics cannot cache results in the same DB |

| `child\_process` for ML | No microservice overhead; simpler ops | Python cold-start adds \~1 s per invocation |

| Session-based authentication | Matches existing SMS admin model | Not stateless; requires a session store at scale |

| Chart.js via CDN | No build step; fast iteration | Larger client payload than a bundled chart library |

| Prepared statements everywhere | Prevent SQL injection; separate structure from data | Slightly more verbose query code |

| Same DB for SMS + analytics | Zero data duplication | Analytics queries share resources with operational load |



\### Deployment topology (as built)



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

│  │        student\_record\_system        │   │

│  │        🟢 apa\_dss\_user (SELECT only) │   │

│  └─────────────────────────────────────┘   │

└────────────────────────────────────────────┘

```



\---



\## 2. Database Schema \& Integration



\### Tables consumed (read-only)



| Table | Primary Key | Purpose |

|---|---|---|

| `students` | `Student\_ID` | Identity, programme, year enrolled, status |

| `modules` | `Module\_Code` | Module metadata, credit hours, year level |

| `student\_enrollments` | `Enrollment\_ID` | Junction: student × module × semester + mark + grade |

| `programmes` | `Programme\_Code` | Programme metadata, duration |

| `faculties` | `Faculty\_Code` | Faculty metadata |

| `semesters` | `Semester\_Code` | Academic year + semester definitions |

| `admins` | `Admin\_ID` | Administrator authentication credentials |



\### Data dictionary — key fields used by APA-DSS



| Field | Table | Type | Meaning |

|---|---|---|---|

| `Student\_ID` | `students` | INT | Unique student identifier |

| `Student\_Name` | `students` | VARCHAR | Student full name |

| `Programme\_Code` | `students` | VARCHAR | Foreign key to `programmes` |

| `Year\_Enrolled` | `students` | INT | Year the student enrolled |

| `Enrollment\_Status` | `students` | VARCHAR | Active / Graduated / Withdrawn |

| `Module\_Code` | `modules` | VARCHAR | Unique module identifier |

| `Module\_Name` | `modules` | VARCHAR | Module name |

| `Credit\_Hours` | `modules` | INT | Module credit weighting |

| `Year\_Level` | `modules` | INT | Year level of the module (1–4) |

| `Semester\_Offered` | `modules` | INT | Semester in which the module is normally offered |

| `Semester\_Code` | `semesters` | VARCHAR | Unique semester identifier |

| `Academic\_Year` | `semesters` | INT | Academic year |

| `Semester\_Number` | `semesters` | INT | 1 or 2 |

| `Mark\_Obtained` | `student\_enrollments` | DECIMAL | Student mark (0–100) |

| `Grade` | `student\_enrollments` | VARCHAR | Letter grade (A/B/C/D/F) |

| `Status` | `student\_enrollments` | VARCHAR | Completed / Withdrawn / In-Progress |



\### Entity relationships



```

faculties (1) ──< programmes (1) ──< modules

&#x20;                       │

&#x20;                       └──< students (1) ──< student\_enrollments >── modules

&#x20;                                                    │

&#x20;                                                    └──> semesters

```



\- One faculty has many programmes.

\- One programme has many modules and many students.

\- One student has many enrolments.

\- One module is attempted by many students.

\- One semester contains many enrolments.

\- `student\_enrollments` is the fact table at the centre of the star — every

&#x20; analytical query ultimately reads from it.



\### Read-only database user setup



```sql

CREATE USER 'apa\_dss\_user'@'localhost'

&#x20; IDENTIFIED WITH mysql\_native\_password BY '<secure\_password>';



GRANT SELECT ON student\_record\_system.\* TO 'apa\_dss\_user'@'localhost';

FLUSH PRIVILEGES;

```



\*\*Verify grants:\*\*



```sql

SHOW GRANTS FOR 'apa\_dss\_user'@'localhost';

\-- Expected:

\--   GRANT USAGE ON \*.\* TO `apa\_dss\_user`@`localhost`

\--   GRANT SELECT ON `student\_record\_system`.\* TO `apa\_dss\_user`@`localhost`

```



\*\*Verify read-only enforcement (should FAIL):\*\*



```sql

\-- Logged in as apa\_dss\_user:

USE student\_record\_system;

CREATE TABLE test\_should\_fail (id INT);

\-- Expected: ERROR 1142 (42000): CREATE command denied

```



\### Why `mysql\_native\_password`?



MySQL 8 defaults to `caching\_sha2\_password`, which the Node.js `mysql2` driver

supports but which requires additional TLS configuration in some environments.

`mysql\_native\_password` is simpler and reliable for local development.



\### Connection pooling



The APA-DSS backend uses a dedicated connection pool separate from the SMS:



```javascript

// backend/config/db-apa.js

const apaPool = mysql.createPool({

&#x20; host: process.env.APA\_DSS\_DB\_HOST,

&#x20; port: process.env.APA\_DSS\_DB\_PORT,

&#x20; user: process.env.APA\_DSS\_DB\_USER,

&#x20; password: process.env.APA\_DSS\_DB\_PASSWORD,

&#x20; database: process.env.APA\_DSS\_DB\_NAME,

&#x20; waitForConnections: true,

&#x20; connectionLimit: 10,

&#x20; queueLimit: 0

});

```



\*\*Why a separate pool?\*\*



\- \*\*Isolation\*\* — separates APA-DSS database connections from other application connections.

\- \*\*Credentials\*\* — analytics always runs as `apa\_dss\_user`, never as `root`.

\- \*\*Least privilege\*\* — the read-only role is enforced at the connection level.



\---



\## 3. Data Flow



\### Analytics request lifecycle (KPI example)



```mermaid

flowchart LR

&#x20;   DB\[("MySQL<br/>student\_enrollments")] -->|SELECT + aggregate| API\["Node.js API<br/>/api/apa-dss/dashboard/kpis"]

&#x20;   API -->|JSON| FE\["Frontend<br/>dashboard.js"]

&#x20;   FE -->|Chart.js| UI\["📊 KPI Card"]

```



\*\*Step by step:\*\*



1\. \*\*Frontend\*\* fetches `/api/apa-dss/dashboard/kpis` via `fetch()`.

2\. \*\*Express\*\* routes the request to `dashboardController.getKpis()`.

3\. \*\*Controller\*\* runs three parallel SQL queries via `apaPool.query()`.

4\. \*\*MySQL\*\* executes each query in \~10–40 ms (indexed on key columns).

5\. \*\*Controller\*\* shapes the three results into one JSON object.

6\. \*\*Express\*\* serialises and returns with `Content-Type: application/json`.

7\. \*\*Frontend\*\* updates the DOM and Chart.js instances.



\*\*Typical total latency:\*\* 80–150 ms round-trip on localhost.



\### ML prediction lifecycle



```mermaid

flowchart LR

&#x20;   DB\[("MySQL")] -->|pandas read\_sql| EXT\["extract.py"]

&#x20;   EXT -->|CSV| PRE\["preprocess.py"]

&#x20;   PRE -->|features| TRN\["train.py<br/>LogisticRegression.fit"]

&#x20;   TRN -->|joblib| PKL\["logistic\_regression.pkl"]

&#x20;   PKL -->|predict.py| SCORE\["Risk scores + top factors"]

&#x20;   SCORE -->|JSON via stdout| NODE\["Node.js<br/>mlService.js"]

&#x20;   NODE -->|JSON| FE\["Frontend<br/>at-risk.js"]

```



\*\*Step by step:\*\*



1\. \*\*`extract.py`\*\* — pulls 10,606 enrollment rows into a pandas DataFrame.

2\. \*\*`preprocess.py`\*\* — engineers per-student features; writes `features.csv`.

3\. \*\*`train.py`\*\* — splits 80/20, scales features, fits Logistic Regression,

&#x20;  serialises the model and scaler with joblib.

4\. \*\*`predict.py`\*\* — loads the model, scores every student, computes top-4

&#x20;  feature contributions per student, prints JSON to stdout.

5\. \*\*`mlService.js`\*\* — Node.js `child\_process.execFile()` captures stdout and

&#x20;  parses it as JSON.

6\. \*\*Frontend\*\* renders risk scores, risk bands, and per-student factors.



\### Why this architecture?



\- \*\*Two languages, one pipeline.\*\* Node handles HTTP and sessions; Python

&#x20; handles numerical work. Each stays in its native ecosystem.

\- \*\*Read-only by construction.\*\* The DB user itself enforces read-only — no

&#x20; application-level guard needed.

\- \*\*No caching layer (yet).\*\* For 600 students and 118 modules, live queries

&#x20; are fast enough. Caching is on the roadmap for scale.



\---



\## 4. API Reference



All endpoints live under `/api`. Analytics endpoints require an authenticated

session; `401 Unauthorized` is returned otherwise.



\### Authentication



| Method | Endpoint | Body / Params | Response |

|---|---|---|---|

| `POST` | `/api/auth/login` | `{ email, password }` | `{ success, admin, redirect }` |

| `POST` | `/api/auth/logout` | — | `{ success, redirect }` |

| `GET` | `/api/auth/me` | — | `{ authenticated, admin }` |

| `GET` | `/api/auth/check` | — | `{ authenticated }` |



\### Dashboard



| Method | Endpoint | Purpose |

|---|---|---|

| `GET` | `/api/apa-dss/dashboard/kpis` | 6 headline KPIs |

| `GET` | `/api/apa-dss/dashboard/trends` | GPA trend by semester |

| `GET` | `/api/apa-dss/dashboard/grade-distribution` | A/B/C/D/F distribution |

| `GET` | `/api/apa-dss/dashboard/progression` | Proceed / Repeat / At-Risk / Excluded |

| `GET` | `/api/apa-dss/dashboard/failure-hotspots` | Bubble chart data |

| `GET` | `/api/apa-dss/dashboard/risk-summary` | At-risk count per programme |



\### Students



| Method | Endpoint | Purpose |

|---|---|---|

| `GET` | `/api/apa-dss/students` | Paginated list + filters (`?programme=\&faculty=\&semester=\&year=`) |

| `GET` | `/api/apa-dss/students/:id` | Full student drill-down |

| `GET` | `/api/apa-dss/students/:id/progression` | Semester-by-semester progression |



\### Modules



| Method | Endpoint | Purpose |

|---|---|---|

| `GET` | `/api/apa-dss/modules` | Module performance table |

| `GET` | `/api/apa-dss/modules/:code` | Module detail (rank, difficulty index, distribution) |

| `GET` | `/api/apa-dss/modules/top` | Top 5 by pass rate |

| `GET` | `/api/apa-dss/modules/bottom` | Bottom 5 by pass rate |



\### Programmes \& Faculties



| Method | Endpoint | Purpose |

|---|---|---|

| `GET` | `/api/apa-dss/programmes` | Programme list with metrics |

| `GET` | `/api/apa-dss/programmes/:code` | Programme detail |

| `GET` | `/api/apa-dss/faculties` | Faculty list with metrics |

| `GET` | `/api/apa-dss/faculties/:code` | Faculty detail |



\### At-Risk (ML)



| Method | Endpoint | Purpose |

|---|---|---|

| `GET` | `/api/apa-dss/at-risk/students` | All students scored by ML |

| `GET` | `/api/apa-dss/at-risk/model-info` | Model Card (algorithm, metrics, features) |

| `POST` | `/api/apa-dss/at-risk/predict` | Trigger ML pipeline rerun |



\### Example response — `/api/apa-dss/dashboard/kpis`



```json

{

&#x20; "total\_students": 600,

&#x20; "total\_programmes": 12,

&#x20; "total\_modules": 118,

&#x20; "pass\_rate": 74.2,

&#x20; "avg\_mark": 62.8,

&#x20; "at\_risk\_count": 182

}

```



\### Error responses



| Code | Meaning | Example |

|---|---|---|

| `400` | Bad request | Missing email or password on login |

| `401` | Unauthorized | No session, or invalid credentials |

| `404` | Not found | Unknown student ID or module code |

| `500` | Server error | Database unreachable, ML script failed |



\---



\## 5. SQL Analytics



APA-DSS calculates every KPI with hand-written SQL. All queries use prepared

statements and run against the read-only `apa\_dss\_user`.



\### Overall Pass Rate



\*\*Purpose:\*\* Headline KPI on the dashboard — percentage of completed enrollments

with a non-fail grade.



```sql

SELECT

&#x20; ROUND(

&#x20;   (

&#x20;     SUM(CASE WHEN Grade != 'F' AND Grade IS NOT NULL THEN 1 ELSE 0 END)

&#x20;     / NULLIF(COUNT(CASE WHEN Grade IS NOT NULL THEN 1 END), 0)

&#x20;   ) \* 100,

&#x20;   2

&#x20; ) AS pass\_rate

FROM student\_enrollments

WHERE Status = 'Completed';

```



\*\*Notes:\*\*



\- `NULLIF(..., 0)` guards against division-by-zero if no graded enrollments exist.

\- `Status = 'Completed'` excludes withdrawn or in-progress enrollments.

\- Rows with `NULL` grade are excluded from both numerator and denominator.

\- `ROUND(..., 2)` keeps the display clean.



\*\*Consumed by:\*\* `/api/apa-dss/dashboard/kpis` → KPI card "Pass Rate"



\---



\### Module Performance



\*\*Purpose:\*\* Powers the dashboard's Top 5 / Bottom 5 module charts and the

module detail modal (rank, difficulty index, mark distribution).



\#### Top / Bottom modules by pass rate



```sql

SELECT

&#x20; m.Module\_Code,

&#x20; m.Module\_Name,

&#x20; COUNT(se.Enrollment\_ID) AS total\_enrolments,

&#x20; SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) AS passed,

&#x20; ROUND(AVG(se.Mark\_Obtained), 2) AS avg\_mark,

&#x20; ROUND(

&#x20;   (

&#x20;     SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END)

&#x20;     / NULLIF(COUNT(CASE WHEN se.Grade IS NOT NULL THEN 1 END), 0)

&#x20;   ) \* 100,

&#x20;   2

&#x20; ) AS pass\_rate

FROM modules m

LEFT JOIN student\_enrollments se

&#x20; ON m.Module\_Code = se.Module\_Code

&#x20;AND se.Status = 'Completed'

GROUP BY m.Module\_Code, m.Module\_Name

ORDER BY pass\_rate ASC;

```



\*\*Notes:\*\*



\- The `AND se.Status = 'Completed'` condition is part of the \*\*JOIN\*\*, not the

&#x20; `WHERE` clause. This is deliberate: it preserves modules that have \*\*zero\*\*

&#x20; completed enrollments (they will show `NULL`/0 counts), which is useful

&#x20; data-quality information.

\- Sort ascending for "worst performing first"; reverse for top performers.



\#### Mark distribution histogram (per module)



```sql

SELECT

&#x20; FLOOR(Mark\_Obtained / 10) \* 10 AS bucket,

&#x20; COUNT(\*) AS students

FROM student\_enrollments

WHERE Module\_Code = ?

&#x20; AND Mark\_Obtained IS NOT NULL

GROUP BY bucket

ORDER BY bucket;

```



\*\*Notes:\*\*



\- Buckets marks into 10-point bins (0–9, 10–19, …, 90–100).

\- Frontend renders these as a histogram.



\*\*Consumed by:\*\* `/api/apa-dss/modules` and `/api/apa-dss/modules/:code`



\---



\### Student Academic History



\*\*Purpose:\*\* Powers the student drill-down modal — marks history chart,

failed-modules list, and progression timeline.



\#### Full academic history



```sql

SELECT

&#x20; s.Student\_ID,

&#x20; s.Student\_Name,

&#x20; se.Module\_Code,

&#x20; m.Module\_Name,

&#x20; se.Mark\_Obtained,

&#x20; se.Grade,

&#x20; se.Semester\_Code,

&#x20; sem.Academic\_Year,

&#x20; sem.Semester\_Number

FROM students s

JOIN student\_enrollments se ON s.Student\_ID = se.Student\_ID

JOIN modules m ON se.Module\_Code = m.Module\_Code

JOIN semesters sem ON se.Semester\_Code = sem.Semester\_Code

WHERE s.Student\_ID = ?

ORDER BY sem.Academic\_Year, sem.Semester\_Number;

```



\*\*Notes:\*\*



\- Parameterised on `Student\_ID` — no string concatenation.

\- Ordered chronologically so the frontend can chart marks over time.

\- Includes grade and mark so both the chart and the failed-modules list are

&#x20; driven by one query.



\#### Class rank within programme



```sql

SELECT

&#x20; s.Student\_ID,

&#x20; s.Student\_Name,

&#x20; ROUND(AVG(se.Mark\_Obtained), 2) AS student\_avg,

&#x20; RANK() OVER (

&#x20;   PARTITION BY s.Programme\_Code

&#x20;   ORDER BY AVG(se.Mark\_Obtained) DESC

&#x20; ) AS rank\_in\_programme

FROM students s

JOIN student\_enrollments se ON s.Student\_ID = se.Student\_ID

WHERE se.Mark\_Obtained IS NOT NULL

GROUP BY s.Student\_ID, s.Student\_Name, s.Programme\_Code;

```



\*\*Notes:\*\*



\- `PARTITION BY s.Programme\_Code` restricts the rank to students \*\*within the

&#x20; same programme\*\* — this is programme rank, not university-wide rank.

\- Ties share the same rank — standard academic convention.



\*\*Consumed by:\*\* `/api/apa-dss/students/:id` and `/api/apa-dss/students/:id/progression`



\---



\## 6. Machine Learning Pipeline



\### Problem Definition



\*\*Objective:\*\* Demonstrate an interpretable ML-based classification pipeline

for identifying students associated with recent academic risk, with the

longer-term goal of developing a validated early-warning model.



\*\*Target definition (as implemented):\*\*



> A student is classified as \*\*At-Risk\*\* if they failed \*\*≥ 50%\*\* of the modules

> they attempted in their most recently completed semester.



\*\*Class distribution:\*\* 182 at-risk (30.3%) · 418 not-at-risk (69.7%)



The 30/70 split is imbalanced — so training uses `class\_weight='balanced'`.



\#### ⚠️ Important methodological note



The current target is constructed from \*\*recent-semester academic performance\*\*.

Because some recent-semester features (e.g., `failed\_last\_sem`,

`failure\_rate\_last\_sem`) are also used as predictors, the current

implementation should be interpreted as a \*\*demonstration of classification and

ML integration\*\*, rather than a validated future-risk prediction model.



A production early-warning model would require \*\*strict temporal separation\*\*

between predictor data and future outcomes (e.g., predict next-semester

performance using only information available \*before\* that semester begins).

This is listed under \[Future Improvements](#12-future-improvements).



\---



\### Feature Engineering



Features are constructed at the \*\*student level\*\* by aggregating enrollment

records across all semesters.



| # | Feature | Type | Source | Description |

|---|---|---|---|---|

| 1 | `avg\_mark` | numeric | `student\_enrollments` | Mean mark across all modules |

| 2 | `num\_modules` | integer | `student\_enrollments` | Total modules attempted |

| 3 | `gpa` | numeric | derived | Estimated GPA (see below) |

| 4 | `year\_level` | integer | `students` | Student's year level, derived from enrolment year and current year |

| 5 | `total\_credits` | integer | `modules` | Sum of credit hours attempted |

| 6 | `num\_failed` | integer | `student\_enrollments` | Count of `Grade = 'F'` |

| 7 | `failure\_rate` | numeric | derived | `num\_failed / num\_modules` |

| 8 | `avg\_mark\_last\_sem` | numeric | `student\_enrollments` | \*\*Mean\*\* mark across all modules in the most recent semester |

| 9 | `total\_last\_sem` | integer | `student\_enrollments` | Modules attempted in the most recent semester |

| 10 | `failed\_last\_sem` | integer | `student\_enrollments` | Failures in the most recent semester |

| 11 | `failure\_rate\_last\_sem` | numeric | derived | `failed\_last\_sem / total\_last\_sem` |

| 12 | `declining\_trend` | binary | derived | `1` if avg mark declining across the last 3 semesters |



\#### GPA mapping



Grade point values used by the pipeline:



| Grade | Grade point |

|---|---|

| A | 4.0 |

| B | 3.0 |

| C | 2.0 |

| D | 1.0 |

| F | 0.0 |



`gpa` is computed as the \*\*simple (unweighted) mean of grade points\*\* across

all completed modules. A credit-weighted GPA is on the roadmap.



\#### `declining\_trend` calculation



`declining\_trend` is set to `1` when a student's per-semester average mark has

\*\*decreased across three consecutive semesters\*\*, otherwise `0`.



Example:



```

Semester 1 average: 72

Semester 2 average: 68

Semester 3 average: 61

72 > 68 > 61  →  declining\_trend = 1

```



Students with fewer than three completed semesters are assigned `0`.



\#### `year\_level` — how it is derived



`year\_level` is derived from the student's \*\*enrolment year\*\*, not from the

module's year level. Specifically:



```

year\_level = current\_academic\_year - Year\_Enrolled + 1

```



This distinguishes the student's progression stage (1st year, 2nd year, …) from

`modules.Year\_Level`, which describes the year level of an individual module.



\*\*Sample code — engineering the core features:\*\*



```python

\# 1. Find each student's most recent semester

last\_semester = (

&#x20;   df.groupby('Student\_ID')\['Semester\_Code']

&#x20;     .max()

&#x20;     .reset\_index()

&#x20;     .rename(columns={'Semester\_Code': 'last\_semester'})

)



\# 2. Keep only records from that semester

last\_sem\_records = df.merge(last\_semester, on='Student\_ID')

last\_sem\_records = last\_sem\_records\[

&#x20;   last\_sem\_records\['Semester\_Code'] == last\_sem\_records\['last\_semester']

]



\# 3. Aggregate recent-semester features — note the MEAN, not last value

last\_sem\_features = last\_sem\_records.groupby('Student\_ID').agg(

&#x20;   avg\_mark\_last\_sem = ('Mark\_Obtained', 'mean'),

&#x20;   total\_last\_sem    = ('Module\_Code',   'count'),

&#x20;   failed\_last\_sem   = ('Grade', lambda x: (x == 'F').sum()),

).reset\_index()



\# 4. Derive failure rate for last semester

last\_sem\_features\['failure\_rate\_last\_sem'] = (

&#x20;   last\_sem\_features\['failed\_last\_sem']

&#x20;   / last\_sem\_features\['total\_last\_sem']

)



\# 5. Aggregate overall features

features = df.groupby('Student\_ID').agg(

&#x20;   avg\_mark    = ('Mark\_Obtained', 'mean'),

&#x20;   num\_modules = ('Module\_Code',   'count'),

&#x20;   num\_failed  = ('Grade', lambda x: (x == 'F').sum()),

).reset\_index()



features\['failure\_rate'] = features\['num\_failed'] / features\['num\_modules']



\# 6. Merge recent-semester features back in

features = features.merge(last\_sem\_features, on='Student\_ID', how='left')

```



\*\*Why these features?\*\*



\- \*\*Direct performance signals\*\* — `avg\_mark`, `num\_failed`, `failure\_rate`.

\- \*\*Recency signals\*\* — the `\*\_last\_sem` family captures current trajectory.

\- \*\*Trajectory signals\*\* — `declining\_trend` detects worsening performance.

\- \*\*Context signals\*\* — `year\_level`, `total\_credits` control for stage of study.



\*\*Why not more features?\*\*



Small dataset (\~600 students). More features → higher overfitting risk. Feature

selection was deliberately conservative.



\---



\### Logistic Regression



Logistic Regression was selected as the \*\*initial interpretable baseline\*\*.

Key properties:



| Property | Benefit |

|---|---|

| \*\*Linear decision boundary\*\* | Coefficients are interpretable |

| \*\*Sigmoid output\*\* | Produces probability estimates between 0 and 1 |

| \*\*L2 regularization\*\* | Reduces overfitting risk on small data |

| \*\*Fast model fitting\*\* | Model fitting is quick on this dataset, enabling frequent retraining |

| \*\*Well understood\*\* | Every prediction traceable to feature contributions |



> \*\*Note on probability calibration:\*\* A sigmoid output produces values in

> \[0, 1], but this does \*\*not\*\* automatically mean the probabilities are

> \*calibrated\*. Calibration testing (reliability curves, Brier score) was not

> performed for this project and is listed under Future Improvements.



\*\*The model in one equation:\*\*



```

p(at\_risk) = σ(w₁x₁ + w₂x₂ + ... + wₙxₙ + b)

```



where:



\- `xᵢ` are the engineered features,

\- `wᵢ` are the learned coefficients,

\- `b` is the bias,

\- `σ(z) = 1 / (1 + e^(−z))` is the sigmoid function.



\*\*Pseudocode for prediction:\*\*



```

FUNCTION predict\_at\_risk(student\_features):

&#x20;   z ← w₁·x₁ + w₂·x₂ + ... + wₙ·xₙ + b

&#x20;   p ← 1 / (1 + e^(−z))

&#x20;   RETURN p, top\_factors(w, x)

END FUNCTION

```



\*\*Interpretability in action:\*\*



\- The \*\*sign\*\* of `wᵢ` tells direction: positive → associated with higher risk.

\- The \*\*magnitude\*\* of `wᵢ · xᵢ` tells how much that feature contributed to \*this\*

&#x20; student's prediction — this is what the UI shows as "top risk factors."



\*\*Why not Random Forest / XGBoost?\*\*



These models were not selected as the initial baseline because the project

prioritises \*\*interpretability, simple deployment, and reproducibility\*\* on a

relatively small dataset. They can be evaluated against Logistic Regression in

future experiments.



\---



\### Training



\*\*Split:\*\* 80% train (480 students) / 20% test (120 students), stratified by

target to preserve the 30/70 class ratio.



\*\*Scaling:\*\* `StandardScaler` — features like `total\_credits` (up to \~500) and

`failure\_rate` (0–1) would otherwise have wildly different scales and hinder

gradient descent.



```python

from sklearn.linear\_model import LogisticRegression

from sklearn.preprocessing import StandardScaler

from sklearn.model\_selection import train\_test\_split

import joblib



\# 1. Split — stratified to preserve class balance

X\_train, X\_test, y\_train, y\_test = train\_test\_split(

&#x20;   X, y,

&#x20;   test\_size=0.2,

&#x20;   random\_state=42,

&#x20;   stratify=y

)



\# 2. Scale features

scaler = StandardScaler()

X\_train\_scaled = scaler.fit\_transform(X\_train)

X\_test\_scaled  = scaler.transform(X\_test)



\# 3. Train with class balancing

model = LogisticRegression(

&#x20;   class\_weight='balanced',

&#x20;   max\_iter=1000,

&#x20;   random\_state=42

)

model.fit(X\_train\_scaled, y\_train)



\# 4. Persist model + scaler for inference

joblib.dump(model,  'models/logistic\_regression.pkl')

joblib.dump(scaler, 'models/scaler.pkl')

```



\*\*Key parameter choices:\*\*



| Parameter | Value | Why |

|---|---|---|

| `class\_weight` | `'balanced'` | Compensates for 30/70 class imbalance |

| `max\_iter` | `1000` | Ensures convergence on this dataset |

| `random\_state` | `42` | Reproducibility |

| `test\_size` | `0.2` | Standard held-out split for small data |



\#### Reproducibility



| Item | Value |

|---|---|

| Python | 3.11 |

| pandas | \*(pin your actual version)\* |

| NumPy | \*(pin your actual version)\* |

| scikit-learn | \*(pin your actual version)\* |

| joblib | \*(pin your actual version)\* |

| `random\_state` | 42 |

| Train/test split | 80 / 20, stratified |

| Cross-validation | 5-fold, stratified |



`requirements.txt` should pin exact versions so results are reproducible.



\---



\### Evaluation



\*\*Test set: 120 held-out students (36 at-risk, 84 not-at-risk)\*\*



| Metric | Value | Interpretation |

|---|---:|---|

| \*\*Accuracy\*\* | 93.3% | Overall correctness |

| \*\*Precision\*\* | 85.0% | Of flagged students, 85% truly at-risk |

| \*\*Recall\*\* | 94.4% | Of all at-risk students, 94% were caught |

| \*\*F1-Score\*\* | 89.5% | Harmonic mean of precision \& recall |

| \*\*AUC-ROC\*\* | 98.6% | Class separation (as measured) |



\*\*Confusion matrix:\*\*



```

&#x20;                   Predicted

&#x20;               Not At-Risk  At-Risk

Actual

Not At-Risk         78         6

At-Risk              2        34

```



\*\*5-fold cross-validation (more reliable):\*\*



| Metric | Value |

|---|---:|

| CV Accuracy | 91.0% ± 1.7% |

| CV Precision | 83.2% ± 3.2% |

| CV Recall | 88.5% ± 5.0% |

| CV F1-Score | 85.6% ± 2.8% |



\*\*Why both?\*\*



\- Test set is small (120) — a single split is less trustworthy.

\- Cross-validation averages across 5 splits — more stable.

\- The CV numbers are the ones to quote in the defence.



\*\*Feature coefficients (learned weights):\*\*



| Feature | Coefficient | Direction |

|---|---:|---|

| `avg\_mark\_last\_sem` | −4.17 | ↓ decreases risk |

| `failure\_rate` | +1.83 | ↑ increases risk |

| `avg\_mark` | +1.23 | ↑ increases risk |

| `year\_level` | +1.12 | ↑ increases risk |

| `num\_modules` | −1.07 | ↓ decreases risk |

| `num\_failed` | +0.98 | ↑ increases risk |

| `gpa` | +0.60 | ↑ increases risk |

| `declining\_trend` | −0.19 | ↓ decreases risk |



The strongest predictor is `avg\_mark\_last\_sem` — recent performance dominates,

which is consistent with the target definition.



> ⚠️ \*\*Reminder:\*\* These metrics were computed on \*\*synthetic training data\*\*.

> They validate that the pipeline is implemented and evaluated correctly; they

> do \*\*not\*\* establish real-world predictive performance.



\---



\### Prediction / Serving



\*\*`predict.py`\*\* — invoked by Node.js on demand and run as a subprocess:



```python

import joblib, json

import pandas as pd



model  = joblib.load('models/logistic\_regression.pkl')

scaler = joblib.load('models/scaler.pkl')



features = pd.read\_csv('data/features.csv')

X = features\[FEATURE\_COLS].values

X\_scaled = scaler.transform(X)



probs = model.predict\_proba(X\_scaled)\[:, 1]

coefs = model.coef\_\[0]



results = \[]

for i, student in enumerate(features.itertuples()):

&#x20;   contributions = sorted(

&#x20;       zip(FEATURE\_COLS, coefs \* X\_scaled\[i]),

&#x20;       key=lambda x: abs(x\[1]),

&#x20;       reverse=True

&#x20;   )\[:4]



&#x20;   results.append({

&#x20;       'student\_id': int(student.Student\_ID),

&#x20;       'student\_name': student.student\_name,

&#x20;       'risk\_probability': float(probs\[i]),

&#x20;       'risk\_band': (

&#x20;           'HIGH'    if probs\[i] >= 0.75 else

&#x20;           'AT\_RISK' if probs\[i] >= 0.50 else

&#x20;           'MONITOR' if probs\[i] >= 0.30 else

&#x20;           'ON\_TRACK'

&#x20;       ),

&#x20;       'top\_factors': \[

&#x20;           {'feature': f, 'impact': round(v, 3)} for f, v in contributions

&#x20;       ]

&#x20;   })



print(json.dumps(results))

```



\*\*Called from Node.js:\*\*



```javascript

function runPrediction() {

&#x20; return new Promise((resolve, reject) => {

&#x20;   const python = process.env.PYTHON\_ENV\_PATH

&#x20;     ? path.join(process.env.PYTHON\_ENV\_PATH, 'Scripts', 'python.exe')

&#x20;     : 'python';



&#x20;   execFile(python, \['models/predict.py'], { cwd: 'ml-pipeline' },

&#x20;     (error, stdout, stderr) => {

&#x20;       if (error) return reject(new Error(stderr || error.message));

&#x20;       try { resolve(JSON.parse(stdout)); }

&#x20;       catch (e) { reject(new Error('Invalid JSON from ML script')); }

&#x20;     });

&#x20; });

}

```



\#### Project-defined UI risk bands



| Band | Probability | UI meaning |

|---|---|---|

| 🔴 HIGH | ≥ 0.75 | Priority advisor review |

| 🟠 AT\_RISK | 0.50 – 0.74 | Advisor review |

| 🟡 MONITOR | 0.30 – 0.49 | Monitor next semester |

| 🟢 ON\_TRACK | < 0.30 | No action needed |



> These thresholds are \*\*project-defined\*\* and used for presentation purposes

> only. They are not statistically validated and should be reviewed against

> institutional outcomes before any operational use. The bands do \*\*not\*\* imply

> that the underlying probabilities are calibrated.



\---



\## 7. Security Model



| Layer | Control |

|---|---|

| \*\*Database\*\* | Dedicated `apa\_dss\_user` with `SELECT`-only grants |

| \*\*Queries\*\* | Prepared statements everywhere — no string concatenation |

| \*\*Secrets\*\* | `.env` excluded from Git via `.gitignore`; `.env.example` documents required variables |

| \*\*Session\*\* | Server-side sessions · `httpOnly` cookies · `sameSite=lax` |

| \*\*Auth\*\* | Admin credentials checked against the `admins` table; user input validated with a regex on email |

| \*\*HTTPS\*\* | `cookie.secure = true` when `NODE\_ENV=production` |

| \*\*Input\*\* | Email validation on login; parameterized SQL everywhere |



\### Known security gaps (documented deliberately)



\- ⚠️ \*\*Password handling\*\* is inherited from the existing SMS authentication

&#x20; system and has \*\*not\*\* been migrated to a modern password-hashing scheme

&#x20; within APA-DSS. (See \[Limitations](#11-limitations--responsible-use).)

\- ⚠️ \*\*No rate limiting\*\* on the login endpoint — should add `express-rate-limit`

&#x20; for production.

\- ⚠️ \*\*No CSRF token\*\* — state-changing endpoints should be CSRF-protected in

&#x20; production.



These are documented as known limitations rather than ignored.



\---



\## 8. Testing Strategy



\### Manual verification matrix



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



\### Data validation approach



\- \*\*Spot-check method:\*\* dashboard values compared against direct SQL queries

&#x20; for 5 different KPIs.

\- \*\*Consistency checks:\*\* pass rate + fail rate = 100%; total enrolments match

&#x20; the sum across modules.

\- \*\*Edge cases tested:\*\* student with 0 completed semesters; student with 100%

&#x20; failure rate; module with 0 enrollments.



\---



\## 9. Deployment Considerations



The current implementation is \*\*development-only\*\*. For institutional deployment:



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



\### Full setup guide



See the \*\*\[Quick Start](../README.md#-quick-start)\*\* in the README for a

5-minute setup. The extended steps below cover deployment-grade installation.



\#### Prerequisites — detailed



| Requirement | Minimum | Verify with |

|---|---|---|

| Node.js | 18 LTS or newer | `node --version` |

| npm | 9+ | `npm --version` |

| MySQL | 8.0 or newer | `mysql --version` |

| Python | 3.10 or newer | `python --version` |

| Git | 2.30+ | `git --version` |



\#### Extended setup



1\. \*\*Clone and install\*\*



&#x20;  ```bash

&#x20;  git clone https://github.com/Keotshepile2/Academic-Analytics-System.git

&#x20;  cd Academic-Analytics-System

&#x20;  npm install

&#x20;  ```



2\. \*\*Import the database\*\*



&#x20;  ```bash

&#x20;  mysql -u root -p < database/Dump20260823.sql

&#x20;  ```



&#x20;  Verify:



&#x20;  ```sql

&#x20;  USE student\_record\_system;

&#x20;  SELECT COUNT(\*) FROM students;              -- expect 600

&#x20;  SELECT COUNT(\*) FROM student\_enrollments;   -- expect 10,606

&#x20;  ```



3\. \*\*Create the read-only user\*\* (see §2 for full detail).



4\. \*\*Configure `.env`\*\* — every variable documented in §2.



&#x20;  \*\*Generating a strong session secret:\*\*



&#x20;  ```bash

&#x20;  # macOS / Linux

&#x20;  openssl rand -base64 32

&#x20;  ```



&#x20;  ```powershell

&#x20;  # Windows (PowerShell)

&#x20;  \[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))

&#x20;  ```



5\. \*\*Set up Python\*\*



&#x20;  ```bash

&#x20;  cd ml-pipeline

&#x20;  python -m venv venv

&#x20;  venv\\Scripts\\activate      # Windows

&#x20;  # source venv/bin/activate # macOS / Linux

&#x20;  pip install -r requirements.txt

&#x20;  ```



6\. \*\*Train the model\*\*



&#x20;  ```bash

&#x20;  python data/extract.py        # 10–20 s — pulls 10,606 rows

&#x20;  python data/preprocess.py     # 2–5 s — engineers features

&#x20;  python models/train.py        # 3–5 s — trains and saves model

&#x20;  python models/evaluate.py     # 2–3 s — prints metrics

&#x20;  deactivate

&#x20;  cd ..

&#x20;  ```



7\. \*\*Run\*\*



&#x20;  ```bash

&#x20;  npm start

&#x20;  ```



\### Troubleshooting



| Symptom | Cause | Fix |

|---|---|---|

| `Access denied for user 'apa\_dss\_user'` | Wrong password in `.env` | Recreate user with the exact password |

| `Access denied for user 'root'` | Wrong root password | Update `DB\_PASSWORD` in `.env` |

| `ER\_NOT\_SUPPORTED\_AUTH\_MODE` | MySQL 8 caching\_sha2 | Recreate user with `mysql\_native\_password` |

| `ECONNREFUSED` | MySQL not running | Start MySQL service |

| `Unknown database 'student\_record\_system'` | DB not imported | Re-import the dump |

| `Cannot find module 'express'` | `npm install` didn't run | Run `npm install` |

| `ModuleNotFoundError: pandas` | venv not activated | Activate venv |

| `python: command not found` | Python not on PATH | Install Python or use full path |

| ML script times out | Slow machine | Increase timeout in `mlService.js` |

| Login fails despite correct password | Admin row wrong | `SELECT \* FROM admins;` |



\---



\## 10. Performance Notes



| Operation | Typical latency | Notes |

|---|---:|---|

| Dashboard KPI query set | 80–150 ms | 3 parallel SQL queries |

| Student list (paginated 50) | 40–80 ms | Indexed on `Student\_ID` |

| Module detail | 60–120 ms | Multiple joins + aggregations |

| ML prediction (all students) | 800–1,500 ms | Python cold-start + inference |

| ML full pipeline (extract + features + fit + evaluate) | 4–8 s | Model fitting itself is sub-second; the total includes data extraction and preprocessing |



\### Optimizations applied



\- \*\*Connection pooling\*\* — 10 connections shared across requests.

\- \*\*Prepared statements\*\* — protect against SQL injection and separate query

&#x20; structure from user-supplied values.

\- \*\*`Promise.all()`\*\* — independent dashboard queries run in parallel.

\- \*\*Indexes\*\* on foreign keys and filter columns.



\### Potential optimizations (roadmap)



\- \*\*Materialized views\*\* for frequently accessed KPIs.

\- \*\*Redis cache\*\* for dashboard responses (5-minute TTL).

\- \*\*Persistent Python process\*\* (Flask / FastAPI) — avoid cold-start per request.

\- \*\*Server-side pagination\*\* for large student lists.



\---



\## 11. Limitations \& Responsible Use



APA-DSS is a \*\*decision-support tool\*\*, not an automated decision system. The

following limitations are documented deliberately.



\### Data limitations



\- \*\*Synthetic training data.\*\* ML metrics validate pipeline correctness, not

&#x20; real-world prediction quality.

\- \*\*No real institutional validation.\*\* Historical data would be required to

&#x20; confirm usefulness.

\- \*\*Local database.\*\* The MySQL instance runs on the developer's machine and is

&#x20; not reachable remotely.



\### Model limitations



\- \*\*No strict temporal separation.\*\* The target is constructed from

&#x20; recent-semester performance, and some of that performance is also used as

&#x20; features. The current implementation should be read as a \*\*classification

&#x20; demonstration\*\*, not a validated future-risk prediction model.

\- \*\*Small training set.\*\* 600 students is enough for Logistic Regression, but

&#x20; limits model complexity.

\- \*\*Binary target.\*\* The 50%-failure rule is a simplification; real risk is

&#x20; continuous.

\- \*\*Uncalibrated probabilities.\*\* Sigmoid outputs lie in \[0, 1] but were not

&#x20; calibrated against observed outcomes.

\- \*\*Project-defined risk bands.\*\* The HIGH / AT\_RISK / MONITOR / ON\_TRACK

&#x20; thresholds are UI labels, not statistically validated cut-offs.



\### Ethical considerations



\- \*\*Human in the loop.\*\* Every prediction is presented as a \*suggestion\*, never

&#x20; an automated verdict. Academic staff remain the decision-makers.

\- \*\*Explainability.\*\* Every risk flag comes with the top contributing features,

&#x20; so advisors can see \*why\* a student was flagged.

\- \*\*POPIA / data-protection considerations.\*\* Real student data must not be

&#x20; deployed without appropriate institutional review. APA-DSS includes

&#x20; privacy-aligned design choices (read-only access, session-based authentication,

&#x20; no data duplication), but institutional compliance involves organisational

&#x20; and legal requirements beyond the application itself.



\### Security limitations



\- Password handling is inherited from the existing SMS authentication system

&#x20; and has not been migrated to a modern password-hashing scheme within APA-DSS.

\- No rate limiting on auth endpoints.

\- No CSRF protection.



\### Deployment limitations



\- Not deployed institutionally.

\- Requires hosted DB, HTTPS, hardened auth, audit logging, and POPIA /

&#x20; data-protection review before production use.



\---



\## 12. Future Improvements



\### Short-term (weeks)



\- ☁️ \*\*Cloud deployment\*\* — AWS RDS for MySQL / Azure Database for MySQL /

&#x20; DigitalOcean Managed MySQL for the DB; Render / Railway / Fly.io for the app.

\- 🔐 \*\*Password hashing\*\* — migrate to bcrypt or argon2 (with a migration path

&#x20; that preserves existing SMS logins).

\- ⚡ \*\*Persistent ML service\*\* — replace `child\_process` with a small FastAPI

&#x20; container or a long-lived Node ↔ Python bridge.



\### Medium-term (months)



\- 🎯 \*\*Temporally separated prediction target\*\* — predict whether a student

&#x20; will experience academic difficulty in the \*\*next semester\*\*, using only

&#x20; information available \*before\* that semester begins.

\- 📊 \*\*Probability calibration\*\* — add reliability curves, Brier score, and

&#x20; calibration error analysis; consider Platt scaling or isotonic regression.

\- 👥 \*\*Role-based access control\*\* — restrict analytics by faculty or programme.

\- 📧 \*\*Automated alerts\*\* — email advisors when a student crosses a risk

&#x20; threshold.

\- 🧠 \*\*Model comparison\*\* — evaluate Random Forest, XGBoost, and Neural

&#x20; Networks against the Logistic baseline.

\- 📈 \*\*Time-series forecasting\*\* — predict next-semester performance using

&#x20; historical trajectories.

\- 📱 \*\*Mobile companion app\*\* — native iOS / Android for advisors.



\### Long-term (research)



\- 🗄 \*\*Data warehouse\*\* — materialized views and columnar storage for scale.

\- 🌍 \*\*Multi-institution schema abstraction\*\* — make APA-DSS deployable to any

&#x20; SRMS.

\- 🔬 \*\*Real-data validation\*\* — collaborate with an institution to validate the

&#x20; model on actual historical records.

\- 🧪 \*\*Causal modelling\*\* — move from correlation ("this predicts risk") to

&#x20; causation ("this intervention reduces risk").



\---



\## Related documentation



\- \[Main README](../README.md) — portfolio overview

\- \[Project Guide](project-guide.html) — presentation walkthrough

\- \[Screenshots](screenshots/) — annotated UI captures



\---



\*Last updated: 2026 · Sol Plaatje University · Mini-Capstone Project\*

