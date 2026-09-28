\# APA-DSS — Academic Performance Analytics \& Decision Support System



A web-based analytics platform that reads from the existing Student Record Management System (SRMS) database in \*\*read-only\*\* mode and provides interactive dashboards, academic KPIs, and an interpretable machine-learning model for early at-risk student identification.



\---



\## Project Overview



This is a \*\*Mini-Capstone project\*\* for Special Topics in Computer Science. It demonstrates the integration of:



\- \*\*Software Engineering\*\* — full-stack web application

\- \*\*Data Analytics\*\* — SQL aggregations, trends, cohort analysis

\- \*\*Machine Learning\*\* — Logistic Regression for at-risk prediction



The system is built on top of an existing SMS (Student Management System) without modifying it. All analytics are read from `student\_record\_system`.



\---



\## Features



\### 📊 Dashboard

\- 6 headline KPIs (students, programmes, modules, pass rate, avg mark, at-risk count)

\- GPA trend by semester

\- Academic progression (Proceed / Repeat / At-Risk / Excluded)

\- Top 5 / Bottom 5 modules by pass rate

\- Failure hotspots (bubble chart)

\- At-risk alerts by programme

\- Semester / Faculty / Programme filters



\### 👨‍🎓 Students

\- Searchable, sortable table with filters

\- Student drill-down modal:

&#x20; - Risk banner (HIGH / AT RISK / MONITOR / ON TRACK)

&#x20; - Class rank within programme

&#x20; - Marks history chart

&#x20; - Comparison to programme and university averages

&#x20; - Failed modules list



\### 📚 Modules

\- Module performance table

\- Module drill-down modal:

&#x20; - Rank in programme

&#x20; - Difficulty index

&#x20; - Pass-rate trend

&#x20; - Mark distribution histogram

&#x20; - Bottom-5 students



\### 🎓 Programmes \& Faculties

\- Programme and faculty cards with key metrics

\- Detail modals



\### ⚠️ At-Risk Students (Machine Learning)

\- Logistic Regression classifier (scikit-learn)

\- Model Card documenting algorithm, training size, metrics, and limitations

\- Risk distribution histogram (all students scored)

\- Per-student top risk factors in plain language

\- Retrain button triggers the full ML pipeline



\### 📄 Reports

\- Academic Summary, Module, Programme, Student, At-Risk reports

\- CSV export

\- Print / PDF via browser



\---



\## Technology Stack



| Layer | Technology |

|-------|-----------|

| Frontend | HTML5, CSS3, JavaScript, Chart.js |

| Backend | Node.js, Express.js |

| Database | MySQL 8 (read-only user) |

| Machine Learning | Python 3.11, scikit-learn, pandas, joblib |

| Integration | Node.js child\_process |



\---



\## Architecture


---

## ML Model — Key Metrics

Trained on 480 students, tested on 120 held-out students.

| Metric | Value |
|--------|-------|
| Accuracy | 93.3% |
| Precision | 85.0% |
| Recall | 94.4% |
| F1-Score | 89.5% |
| AUC-ROC | 98.6% |
| 5-fold CV Accuracy | 91.0% ± 1.7% |

**Interpretability:** Feature coefficients (from logistic regression) show that `avg_mark_last_sem`, `failure_rate`, and `num_failed` are the strongest predictors.

**Limitations:** Trained on synthetic data. Decision-support only — not a diagnosis or automated decision.

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- Python 3.10+

### Step 1: Clone the repository
```bash
git clone https://github.com/Keotshepile2/Academic-Analytics-System.git
cd apa-dss

