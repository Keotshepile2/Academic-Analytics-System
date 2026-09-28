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



