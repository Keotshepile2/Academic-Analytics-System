\# Synthetic Data Generator



Generates a realistic synthetic dataset for the APA-DSS system.



\## Overview



| Item | Value |

|------|-------|

| \*\*Students\*\* | 600 |

| \*\*Faculties\*\* | 5 (FCS, FEN, FBS, FAS, FHS) |

| \*\*Programmes\*\* | 5 |

| \*\*Semesters\*\* | 6 (2023 S1 – 2025 S2) |

| \*\*Modules\*\* | 100+ across all programmes |

| \*\*Enrolments\*\* | \~10,000 |

| \*\*Random seed\*\* | 42 (reproducible) |



\## Data Design



\### Mark Distribution



Students are assigned one of three profiles:



| Profile | Weight | Mean mark | SD |

|---------|--------|-----------|-----|

| Excellent | 10% | 78 | 8 |

| Mainstream | 75% | 62 | 10 |

| Struggling | 15% | 45 | 10 |



\### Module Difficulty



Each module has a `difficulty\_offset` that shifts its mark distribution:



\- \*\*Hard modules\*\* (e.g., Engineering Mathematics): `-6` to `-9`

\- \*\*Standard modules\*\*: `0`

\- \*\*Easier modules\*\* (e.g., Communication Skills): `+4` to `+7`



\### Grade Boundaries (SA convention)



| Grade | Range |

|-------|-------|

| A | 75–100 |

| B | 70–74 |

| C | 60–69 |

| D | 50–59 |

| F | 0–49 |



\### Progression



\- Students start in 2023, 2024, or 2025

\- They progress semester-by-semester through their programme

\- Year-level modules advance with them (Year 1 → Year 2 → Year 3)

\- Withdrawn students stop earlier

\- Graduated students have completed 6 semesters



\## How to Regenerate



```bash

\# 1. Activate Python environment

cd ml-pipeline

.\\venv\\Scripts\\Activate.ps1



\# 2. Run the generator

python data\\generate\_synthetic\_data.py



\# 3. Load the SQL into MySQL (from project root)

mysql -u root -p student\_record\_system < ml-pipeline\\data\\synthetic\_data.sql



\# 4. Re-run the ML pipeline

python data\\extract.py

python data\\preprocess.py

python models\\train.py

python models\\evaluate.py

python models\\predict.py

