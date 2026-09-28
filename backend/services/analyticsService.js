const { analyticsPool } = require('../config/db');

// ============================================
// SHARED HELPERS - Single source of truth
// ============================================

/**
 * CANONICAL PASS RATE DEFINITION:
 *   Passed completed enrollments / All completed enrollments * 100
 * 
 * Applied consistently across Dashboard, Students, Modules, Programmes, Faculties.
 */
async function getPassRate(filters = {}) {
    const conditions = [`se.Status = 'Completed'`, `se.Grade IS NOT NULL`];
    const params = [];

    if (filters.programme && filters.programme !== 'all') {
        conditions.push(`UPPER(s.Programme_Code) = UPPER(?)`);
        params.push(filters.programme);
    }
    if (filters.faculty && filters.faculty !== 'all') {
        conditions.push(`UPPER(p.Faculty_Code) = UPPER(?)`);
        params.push(filters.faculty);
    }
    if (filters.semester && filters.semester !== 'all') {
        conditions.push(`se.Semester_Code = ?`);
        params.push(filters.semester);
    }

    const [rows] = await analyticsPool.query(
        `SELECT
            COUNT(*) AS total_completed,
            SUM(CASE WHEN se.Grade != 'F' THEN 1 ELSE 0 END) AS total_passed,
            ROUND(
                (SUM(CASE WHEN se.Grade != 'F' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100,
                2
            ) AS pass_rate
        FROM student_enrollments se
        JOIN students s ON se.Student_ID = s.Student_ID
        LEFT JOIN programmes p ON s.Programme_Code = p.Programme_Code
        WHERE ${conditions.join(' AND ')}`,
        params
    );

    const row = rows[0] || {};
    return {
        pass_rate: Number(row.pass_rate) || 0,
        total_completed: Number(row.total_completed) || 0,
        total_passed: Number(row.total_passed) || 0
    };
}

/**
 * Academic year helper - returns the most recent year present in the semesters table.
 */
async function getAcademicYear() {
    const [rows] = await analyticsPool.query(
        `SELECT MAX(Academic_Year) AS current_year FROM semesters`
    );
    return Number(rows[0]?.current_year) || new Date().getFullYear();
}

/**
 * Current semester (most recent by academic year + semester number).
 */
async function getCurrentSemester() {
    const [rows] = await analyticsPool.query(
        `SELECT Semester_Code, Academic_Year, Semester_Number
         FROM semesters
         ORDER BY Academic_Year DESC, Semester_Number DESC
         LIMIT 1`
    );
    return rows[0] || null;
}

// ============================================
// DASHBOARD KPIs
// ============================================
async function getDashboardKPIs(filters = {}) {
    // Build reusable WHERE clause
    const conditions = [];
    const params = [];

    if (filters.programme && filters.programme !== 'all') {
        conditions.push(`UPPER(s.Programme_Code) = UPPER(?)`);
        params.push(filters.programme);
    }
    if (filters.faculty && filters.faculty !== 'all') {
        conditions.push(`UPPER(p.Faculty_Code) = UPPER(?)`);
        params.push(filters.faculty);
    }
    if (filters.semester && filters.semester !== 'all') {
        conditions.push(`se.Semester_Code = ?`);
        params.push(filters.semester);
    }

    const studentWhere = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    // Total students (filtered)
    const [students] = await analyticsPool.query(`
        SELECT COUNT(DISTINCT s.Student_ID) AS total
        FROM students s
        INNER JOIN student_enrollments se ON s.Student_ID = se.Student_ID AND se.Status = 'Completed'
        LEFT JOIN programmes p ON s.Programme_Code = p.Programme_Code
        WHERE 1=1 ${studentWhere}
    `, params);

    // Programmes (filtered)
    const progConditions = [];
    const progParams = [];
    if (filters.faculty && filters.faculty !== 'all') {
        progConditions.push(`UPPER(p.Faculty_Code) = UPPER(?)`);
        progParams.push(filters.faculty);
    }
    if (filters.programme && filters.programme !== 'all') {
        progConditions.push(`UPPER(p.Programme_Code) = UPPER(?)`);
        progParams.push(filters.programme);
    }
    const progWhere = progConditions.length > 0 ? 'AND ' + progConditions.join(' AND ') : '';

    const [programmes] = await analyticsPool.query(`
        SELECT COUNT(DISTINCT p.Programme_Code) AS total
        FROM programmes p
        INNER JOIN students s ON s.Programme_Code = p.Programme_Code
        WHERE 1=1 ${progWhere}
    `, progParams);

    // Faculties (filtered)
    const facConditions = [];
    const facParams = [];
    if (filters.faculty && filters.faculty !== 'all') {
        facConditions.push(`UPPER(f.Faculty_Code) = UPPER(?)`);
        facParams.push(filters.faculty);
    }
    const facWhere = facConditions.length > 0 ? 'AND ' + facConditions.join(' AND ') : '';

    const [faculties] = await analyticsPool.query(`
        SELECT COUNT(DISTINCT f.Faculty_Code) AS total
        FROM faculties f
        INNER JOIN programmes p ON p.Faculty_Code = f.Faculty_Code
        INNER JOIN students s ON s.Programme_Code = p.Programme_Code
        WHERE 1=1 ${facWhere}
    `, facParams);

    // Modules (filtered)
    const modConditions = [];
    const modParams = [];
    if (filters.programme && filters.programme !== 'all') {
        modConditions.push(`UPPER(m.Programme_Code) = UPPER(?)`);
        modParams.push(filters.programme);
    }
    if (filters.faculty && filters.faculty !== 'all') {
        modConditions.push(`UPPER(p.Faculty_Code) = UPPER(?)`);
        modParams.push(filters.faculty);
    }
    const modWhere = modConditions.length > 0 ? 'AND ' + modConditions.join(' AND ') : '';

    const [moduleStats] = await analyticsPool.query(`
        SELECT
            (SELECT COUNT(DISTINCT m.Module_Code) FROM modules m
             LEFT JOIN programmes p ON m.Programme_Code = p.Programme_Code
             WHERE 1=1 ${modWhere}) AS total_modules,
            (SELECT COUNT(DISTINCT m.Module_Code)
             FROM modules m
             INNER JOIN student_enrollments se ON se.Module_Code = m.Module_Code AND se.Status = 'Completed'
             LEFT JOIN programmes p ON m.Programme_Code = p.Programme_Code
             WHERE 1=1 ${modWhere}) AS active_modules
    `, [...modParams, ...modParams]);

    // Pass rate (uses existing helper — already supports filters)
    const passRateData = await getPassRate(filters);

    // Average mark (filtered)
    const [avgMark] = await analyticsPool.query(`
        SELECT ROUND(AVG(se.Mark_Obtained), 2) AS avg_mark
        FROM student_enrollments se
        INNER JOIN students s ON se.Student_ID = s.Student_ID
        LEFT JOIN programmes p ON s.Programme_Code = p.Programme_Code
        WHERE se.Mark_Obtained IS NOT NULL AND se.Status = 'Completed' ${studentWhere}
    `, params);

    // At-risk (filtered)
    const atRiskConditions = [];
    const atRiskParams = [];
    if (filters.programme && filters.programme !== 'all') {
        atRiskConditions.push(`UPPER(s.Programme_Code) = UPPER(?)`);
        atRiskParams.push(filters.programme);
    }
    if (filters.faculty && filters.faculty !== 'all') {
        atRiskConditions.push(`UPPER(p.Faculty_Code) = UPPER(?)`);
        atRiskParams.push(filters.faculty);
    }
    if (filters.semester && filters.semester !== 'all') {
        atRiskConditions.push(`se.Semester_Code = ?`);
        atRiskParams.push(filters.semester);
    }
    const atRiskWhere = atRiskConditions.length > 0 ? 'AND ' + atRiskConditions.join(' AND ') : '';

    const [atRisk] = await analyticsPool.query(`
        WITH last_semester AS (
            SELECT se.Student_ID, MAX(se.Semester_Code) AS last_sem
            FROM student_enrollments se
            INNER JOIN students s ON se.Student_ID = s.Student_ID
            LEFT JOIN programmes p ON s.Programme_Code = p.Programme_Code
            WHERE se.Status = 'Completed' ${atRiskWhere}
            GROUP BY se.Student_ID
        ),
        failures AS (
            SELECT se.Student_ID,
                   COUNT(*) AS total_count,
                   SUM(CASE WHEN se.Grade = 'F' THEN 1 ELSE 0 END) AS failed_count
            FROM student_enrollments se
            INNER JOIN last_semester ls
                ON se.Student_ID = ls.Student_ID AND se.Semester_Code = ls.last_sem
            WHERE se.Status = 'Completed'
            GROUP BY se.Student_ID
        )
        SELECT COUNT(*) AS at_risk_count
        FROM failures
        WHERE (failed_count / NULLIF(total_count, 0)) >= 0.5
    `, atRiskParams);

    const academicYear = await getAcademicYear();
    const currentSemester = await getCurrentSemester();

    return {
        total_students: Number(students[0]?.total) || 0,
        total_programmes: Number(programmes[0]?.total) || 0,
        total_faculties: Number(faculties[0]?.total) || 0,
        total_modules: Number(moduleStats[0]?.total_modules) || 0,
        active_modules: Number(moduleStats[0]?.active_modules) || 0,
        overall_pass_rate: passRateData.pass_rate,
        overall_failure_rate: 100 - passRateData.pass_rate,
        overall_avg_mark: Number(avgMark[0]?.avg_mark) || 0,
        at_risk_students: Number(atRisk[0]?.at_risk_count) || 0,
        current_academic_year: academicYear,
        current_semester: currentSemester
            ? `${currentSemester.Academic_Year} S${currentSemester.Semester_Number}`
            : 'N/A'
    };
}
// ============================================
// STUDENTS
// ============================================
async function getStudents(filters = {}) {
    let query = `
        SELECT
            s.Student_ID AS id,
            s.Student_Name AS name,
            s.Email_Address AS email,
            UPPER(s.Programme_Code) AS programme,
            UPPER(p.Faculty_Code) AS faculty,
            s.Enrollment_Status AS status,
            ROUND(AVG(se.Mark_Obtained), 2) AS avgMark,
            COUNT(se.Enrollment_ID) AS totalModules,
            SUM(CASE WHEN se.Grade = 'F' THEN 1 ELSE 0 END) AS failedModules,
            SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) AS passedModules,
            ROUND(AVG(CASE se.Grade
                WHEN 'A' THEN 4.0
                WHEN 'B' THEN 3.0
                WHEN 'C' THEN 2.0
                WHEN 'D' THEN 1.0
                WHEN 'F' THEN 0.0
                ELSE NULL
            END), 2) AS gpa,
            (
                SELECT MAX(Semester_Code)
                FROM student_enrollments se2
                WHERE se2.Student_ID = s.Student_ID AND se2.Status = 'Completed'
            ) AS semester,
            CASE
                WHEN COALESCE((
                    SELECT SUM(CASE WHEN Grade = 'F' THEN 1 ELSE 0 END) /
                           NULLIF(COUNT(*), 0)
                    FROM student_enrollments se2
                    WHERE se2.Student_ID = s.Student_ID
                      AND se2.Semester_Code = (
                          SELECT MAX(Semester_Code) FROM student_enrollments se3
                          WHERE se3.Student_ID = s.Student_ID AND se3.Status = 'Completed'
                      )
                      AND se2.Status = 'Completed'
                ), 0) >= 0.5 THEN 'High'
                WHEN COALESCE((
                    SELECT SUM(CASE WHEN Grade = 'F' THEN 1 ELSE 0 END) /
                           NULLIF(COUNT(*), 0)
                    FROM student_enrollments se2
                    WHERE se2.Student_ID = s.Student_ID
                      AND se2.Semester_Code = (
                          SELECT MAX(Semester_Code) FROM student_enrollments se3
                          WHERE se3.Student_ID = s.Student_ID AND se3.Status = 'Completed'
                      )
                      AND se2.Status = 'Completed'
                ), 0) >= 0.3 THEN 'Medium'
                ELSE 'Low'
            END AS riskLevel
        FROM students s
        INNER JOIN student_enrollments se
            ON s.Student_ID = se.Student_ID AND se.Status = 'Completed'
        LEFT JOIN programmes p ON s.Programme_Code = p.Programme_Code
        WHERE 1=1
    `;

    const params = [];

    if (filters.search) {
        query += ` AND (s.Student_Name LIKE ? OR s.Student_ID LIKE ?)`;
        params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.programme && filters.programme !== 'all') {
        query += ` AND UPPER(s.Programme_Code) = UPPER(?)`;
        params.push(filters.programme);
    }
    if (filters.faculty && filters.faculty !== 'all') {
        query += ` AND UPPER(p.Faculty_Code) = UPPER(?)`;
        params.push(filters.faculty);
    }
    if (filters.status && filters.status !== 'all') {
        query += ` AND s.Enrollment_Status = ?`;
        params.push(filters.status);
    }
    if (filters.semester && filters.semester !== 'all') {
        query += ` AND EXISTS (
            SELECT 1 FROM student_enrollments se2
            WHERE se2.Student_ID = s.Student_ID AND se2.Semester_Code = ?
        )`;
        params.push(filters.semester);
    }

    query += ` GROUP BY s.Student_ID HAVING totalModules > 0 ORDER BY s.Student_ID`;

    const [rows] = await analyticsPool.query(query, params);

    // Normalise numeric types so frontend .toFixed works correctly
    return rows.map(r => ({
        ...r,
        avgMark: Number(r.avgMark) || 0,
        gpa: Number(r.gpa) || 0,
        totalModules: Number(r.totalModules) || 0,
        failedModules: Number(r.failedModules) || 0,
        passedModules: Number(r.passedModules) || 0
    }));
}

// ============================================
// MODULES
// ============================================
async function getModules(filters = {}) {
    let query = `
        SELECT
            m.Module_Code AS code,
            m.Module_Name AS name,
            UPPER(m.Programme_Code) AS programme,
            UPPER(p.Faculty_Code) AS faculty,
            COALESCE(m.Semester_Offered, 0) AS semester,
            COUNT(se.Enrollment_ID) AS enrolments,
            ROUND(
                (SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) /
                 NULLIF(COUNT(CASE WHEN se.Grade IS NOT NULL THEN 1 END), 0)) * 100,
                2
            ) AS passRate,
            ROUND(AVG(se.Mark_Obtained), 2) AS avgMark,
            CASE
                WHEN ROUND(
                    (SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) /
                     NULLIF(COUNT(CASE WHEN se.Grade IS NOT NULL THEN 1 END), 0)) * 100,
                    2
                ) >= 70 THEN 'high'
                WHEN ROUND(
                    (SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) /
                     NULLIF(COUNT(CASE WHEN se.Grade IS NOT NULL THEN 1 END), 0)) * 100,
                    2
                ) >= 60 THEN 'medium'
                ELSE 'low'
            END AS status
        FROM modules m
        INNER JOIN student_enrollments se
            ON m.Module_Code = se.Module_Code AND se.Status = 'Completed'
        LEFT JOIN programmes p ON m.Programme_Code = p.Programme_Code
        WHERE 1=1
    `;

    const params = [];

    if (filters.search) {
        query += ` AND (m.Module_Code LIKE ? OR m.Module_Name LIKE ?)`;
        params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.faculty && filters.faculty !== 'all') {
        query += ` AND UPPER(p.Faculty_Code) = UPPER(?)`;
        params.push(filters.faculty);
    }
    if (filters.programme && filters.programme !== 'all') {
        query += ` AND UPPER(m.Programme_Code) = UPPER(?)`;
        params.push(filters.programme);
    }
    if (filters.semester && filters.semester !== 'all') {
        query += ` AND m.Semester_Offered = ?`;
        params.push(parseInt(filters.semester.slice(-1)));
    }

    query += ` GROUP BY m.Module_Code HAVING enrolments > 0 ORDER BY m.Module_Code`;

    const [rows] = await analyticsPool.query(query, params);

    return rows.map(r => ({
        ...r,
        passRate: Number(r.passRate) || 0,
        avgMark: Number(r.avgMark) || 0,
        enrolments: Number(r.enrolments) || 0,
        semester: Number(r.semester) || 0
    }));
}

// ============================================
// PROGRAMMES
// ============================================
async function getProgrammes(filters = {}) {
    let query = `
        SELECT
            UPPER(p.Programme_Code) AS code,
            p.Programme_Name AS name,
            UPPER(p.Faculty_Code) AS faculty,
            COUNT(DISTINCT s.Student_ID) AS students,
            COUNT(DISTINCT m.Module_Code) AS modules,
            ROUND(
                (SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) /
                 NULLIF(COUNT(CASE WHEN se.Grade IS NOT NULL THEN 1 END), 0)) * 100,
                2
            ) AS passRate,
            ROUND(AVG(se.Mark_Obtained), 2) AS avgMark,
            COALESCE((
                SELECT COUNT(DISTINCT s2.Student_ID)
                FROM students s2
                LEFT JOIN student_enrollments se2
                    ON s2.Student_ID = se2.Student_ID AND se2.Status = 'Completed'
                WHERE s2.Programme_Code = p.Programme_Code
                  AND se2.Semester_Code = (
                      SELECT MAX(Semester_Code) FROM student_enrollments se3
                      WHERE se3.Student_ID = s2.Student_ID AND se3.Status = 'Completed'
                  )
                  AND (
                      SELECT SUM(CASE WHEN se4.Grade = 'F' THEN 1 ELSE 0 END) /
                             NULLIF(COUNT(*), 0)
                      FROM student_enrollments se4
                      WHERE se4.Student_ID = s2.Student_ID
                        AND se4.Semester_Code = (
                            SELECT MAX(Semester_Code) FROM student_enrollments se5
                            WHERE se5.Student_ID = s2.Student_ID AND se5.Status = 'Completed'
                        )
                        AND se4.Status = 'Completed'
                  ) >= 0.5
            ), 0) AS atRisk
        FROM programmes p
        INNER JOIN students s ON p.Programme_Code = s.Programme_Code
        LEFT JOIN modules m ON p.Programme_Code = m.Programme_Code
        LEFT JOIN student_enrollments se
            ON s.Student_ID = se.Student_ID AND se.Status = 'Completed'
        WHERE 1=1
    `;

    const params = [];

    if (filters.search) {
        query += ` AND (p.Programme_Code LIKE ? OR p.Programme_Name LIKE ?)`;
        params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.faculty && filters.faculty !== 'all') {
        query += ` AND UPPER(p.Faculty_Code) = UPPER(?)`;
        params.push(filters.faculty);
    }

    query += ` GROUP BY p.Programme_Code HAVING students > 0 ORDER BY p.Programme_Code`;

    const [rows] = await analyticsPool.query(query, params);

    return rows.map(r => ({
        ...r,
        students: Number(r.students) || 0,
        modules: Number(r.modules) || 0,
        passRate: Number(r.passRate) || 0,
        avgMark: Number(r.avgMark) || 0,
        atRisk: Number(r.atRisk) || 0
    }));
}

// ============================================
// FACULTIES
// ============================================
async function getFaculties() {
    const [rows] = await analyticsPool.query(`
        SELECT
            UPPER(f.Faculty_Code) AS code,
            f.Faculty_Name AS name,
            COUNT(DISTINCT p.Programme_Code) AS programmes,
            COUNT(DISTINCT s.Student_ID) AS students,
            COUNT(DISTINCT m.Module_Code) AS modules,
            ROUND(
                (SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) /
                 NULLIF(COUNT(CASE WHEN se.Grade IS NOT NULL THEN 1 END), 0)) * 100,
                2
            ) AS passRate,
            ROUND(AVG(se.Mark_Obtained), 2) AS avgMark,
            COALESCE((
                SELECT COUNT(DISTINCT s2.Student_ID)
                FROM students s2
                LEFT JOIN student_enrollments se2
                    ON s2.Student_ID = se2.Student_ID AND se2.Status = 'Completed'
                WHERE s2.Programme_Code IN (
                    SELECT Programme_Code FROM programmes p2
                    WHERE p2.Faculty_Code = f.Faculty_Code
                )
                  AND se2.Semester_Code = (
                      SELECT MAX(Semester_Code) FROM student_enrollments se3
                      WHERE se3.Student_ID = s2.Student_ID AND se3.Status = 'Completed'
                  )
                  AND (
                      SELECT SUM(CASE WHEN se4.Grade = 'F' THEN 1 ELSE 0 END) /
                             NULLIF(COUNT(*), 0)
                      FROM student_enrollments se4
                      WHERE se4.Student_ID = s2.Student_ID
                        AND se4.Semester_Code = (
                            SELECT MAX(Semester_Code) FROM student_enrollments se5
                            WHERE se5.Student_ID = s2.Student_ID AND se5.Status = 'Completed'
                        )
                        AND se4.Status = 'Completed'
                  ) >= 0.5
            ), 0) AS atRisk
        FROM faculties f
        INNER JOIN programmes p ON f.Faculty_Code = p.Faculty_Code
        INNER JOIN students s ON p.Programme_Code = s.Programme_Code
        LEFT JOIN modules m ON p.Programme_Code = m.Programme_Code
        LEFT JOIN student_enrollments se
            ON s.Student_ID = se.Student_ID AND se.Status = 'Completed'
        GROUP BY f.Faculty_Code
        HAVING programmes > 0
        ORDER BY f.Faculty_Code
    `);

    return rows.map(r => ({
        ...r,
        programmes: Number(r.programmes) || 0,
        students: Number(r.students) || 0,
        modules: Number(r.modules) || 0,
        passRate: Number(r.passRate) || 0,
        avgMark: Number(r.avgMark) || 0,
        atRisk: Number(r.atRisk) || 0
    }));
}

// ============================================
// AT-RISK (SQL fallback; primary path uses mlService)
// ============================================
async function getAtRiskStudents(filters = {}) {
    let query = `
        WITH last_semester AS (
            SELECT Student_ID, MAX(Semester_Code) AS last_sem
            FROM student_enrollments
            WHERE Status = 'Completed'
            GROUP BY Student_ID
        ),
        student_metrics AS (
            SELECT
                s.Student_ID AS id,
                s.Student_Name AS name,
                UPPER(s.Programme_Code) AS programme,
                UPPER(p.Faculty_Code) AS faculty,
                ROUND(AVG(se.Mark_Obtained), 2) AS avgMark,
                COUNT(se.Enrollment_ID) AS totalModules,
                SUM(CASE WHEN se.Grade = 'F' THEN 1 ELSE 0 END) AS failedModules,
                COALESCE(
                    SUM(CASE WHEN se.Grade = 'F' THEN 1 ELSE 0 END) /
                    NULLIF(COUNT(se.Enrollment_ID), 0),
                    0
                ) AS riskProbability,
                CASE
                    WHEN COALESCE((
                        SUM(CASE WHEN se.Grade = 'F' AND se.Semester_Code = ls.last_sem THEN 1 ELSE 0 END) /
                        NULLIF(COUNT(CASE WHEN se.Semester_Code = ls.last_sem THEN 1 END), 0)
                    ), 0) >= 0.5 THEN 'High'
                    WHEN COALESCE((
                        SUM(CASE WHEN se.Grade = 'F' AND se.Semester_Code = ls.last_sem THEN 1 ELSE 0 END) /
                        NULLIF(COUNT(CASE WHEN se.Semester_Code = ls.last_sem THEN 1 END), 0)
                    ), 0) >= 0.3 THEN 'Medium'
                    ELSE 'Low'
                END AS riskLevel,
                s.Enrollment_Status AS status
            FROM students s
            INNER JOIN student_enrollments se ON s.Student_ID = se.Student_ID
            INNER JOIN last_semester ls ON s.Student_ID = ls.Student_ID
            LEFT JOIN programmes p ON s.Programme_Code = p.Programme_Code
            WHERE se.Status = 'Completed'
            GROUP BY s.Student_ID
        )
        SELECT * FROM student_metrics
        WHERE riskLevel IN ('High', 'Medium')
    `;

    const params = [];

    if (filters.search) {
        query += ` AND (name LIKE ? OR id LIKE ?)`;
        params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.risk && filters.risk !== 'all') {
        query += ` AND riskLevel = ?`;
        params.push(filters.risk);
    }
    if (filters.programme && filters.programme !== 'all') {
        query += ` AND UPPER(programme) = UPPER(?)`;
        params.push(filters.programme);
    }

    query += ` ORDER BY riskProbability DESC`;

    const [rows] = await analyticsPool.query(query, params);

    return rows.map(r => ({
        ...r,
        avgMark: Number(r.avgMark) || 0,
        totalModules: Number(r.totalModules) || 0,
        failedModules: Number(r.failedModules) || 0,
        riskProbability: Number(r.riskProbability) || 0
    }));
}

// ============================================
// SEMESTER TRENDS
// ============================================
async function getSemesterTrends() {
    const [rows] = await analyticsPool.query(`
        SELECT
            CONCAT(s.Academic_Year, ' S', s.Semester_Number) AS semester,
            s.Academic_Year,
            s.Semester_Number,
            ROUND(
                (SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) /
                 NULLIF(COUNT(CASE WHEN se.Grade IS NOT NULL THEN 1 END), 0)) * 100,
                2
            ) AS passRate,
            ROUND(AVG(se.Mark_Obtained), 2) AS avgMark
        FROM semesters s
        LEFT JOIN student_enrollments se
            ON s.Semester_Code = se.Semester_Code AND se.Status = 'Completed'
        GROUP BY s.Semester_Code
        ORDER BY s.Academic_Year, s.Semester_Number
    `);

    return rows.map(r => ({
        ...r,
        passRate: Number(r.passRate) || 0,
        avgMark: Number(r.avgMark) || 0
    }));
}

// ============================================
// GRADE DISTRIBUTION
// ============================================
async function getGradeDistribution() {
    const [rows] = await analyticsPool.query(`
        SELECT Grade AS grade, COUNT(*) AS count
        FROM student_enrollments
        WHERE Grade IS NOT NULL AND Grade != '' AND Status = 'Completed'
        GROUP BY Grade
        ORDER BY CASE Grade
            WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3
            WHEN 'D' THEN 4 WHEN 'F' THEN 5 ELSE 6
        END
    `);

    return rows.map(r => ({ grade: r.grade, count: Number(r.count) || 0 }));
}


// ============================================
// GPA TRENDS (per semester)
// ============================================
async function getGpaTrends(filters = {}) {
    const conditions = [`se.Status = 'Completed'`, `se.Grade IS NOT NULL`];
    const params = [];

    if (filters.programme && filters.programme !== 'all') {
        conditions.push(`UPPER(s.Programme_Code) = UPPER(?)`);
        params.push(filters.programme);
    }
    if (filters.faculty && filters.faculty !== 'all') {
        conditions.push(`UPPER(p.Faculty_Code) = UPPER(?)`);
        params.push(filters.faculty);
    }

    const [rows] = await analyticsPool.query(
        `SELECT
            sem.Semester_Code AS semester_code,
            CONCAT(sem.Academic_Year, ' S', sem.Semester_Number) AS semester,
            sem.Academic_Year,
            sem.Semester_Number,
            COUNT(se.Enrollment_ID) AS total_enrollments,
            ROUND(AVG(CASE se.Grade
                WHEN 'A' THEN 4.0
                WHEN 'B' THEN 3.0
                WHEN 'C' THEN 2.0
                WHEN 'D' THEN 1.0
                WHEN 'F' THEN 0.0
                ELSE NULL
            END), 2) AS gpa
        FROM semesters sem
        LEFT JOIN student_enrollments se
            ON sem.Semester_Code = se.Semester_Code
        LEFT JOIN students s ON se.Student_ID = s.Student_ID
        LEFT JOIN programmes p ON s.Programme_Code = p.Programme_Code
        WHERE ${conditions.join(' AND ')}
        GROUP BY sem.Semester_Code
        ORDER BY sem.Academic_Year, sem.Semester_Number`,
        params
    );

    return rows.map(r => ({
        semester_code: r.semester_code,
        semester: r.semester,
        academic_year: Number(r.Academic_Year) || 0,
        semester_number: Number(r.Semester_Number) || 0,
        total_enrollments: Number(r.total_enrollments) || 0,
        gpa: Number(r.gpa) || 0
    }));
}

// ============================================
// PROGRESSION (Proceed / Repeat / At-Risk / Excluded per semester)
// ============================================
async function getProgressionTrends(filters = {}) {
    const conditions = [`se.Status = 'Completed'`, `se.Grade IS NOT NULL`];
    const params = [];

    if (filters.programme && filters.programme !== 'all') {
        conditions.push(`UPPER(s.Programme_Code) = UPPER(?)`);
        params.push(filters.programme);
    }
    if (filters.faculty && filters.faculty !== 'all') {
        conditions.push(`UPPER(p.Faculty_Code) = UPPER(?)`);
        params.push(filters.faculty);
    }
    if (filters.semester && filters.semester !== 'all') {
        conditions.push(`se.Semester_Code = ?`);
        params.push(filters.semester);
    }

    const [rows] = await analyticsPool.query(`
        WITH per_student_sem AS (
            SELECT
                se.Student_ID,
                se.Semester_Code,
                COUNT(*) AS total_modules,
                SUM(CASE WHEN se.Grade = 'F' THEN 1 ELSE 0 END) AS failed_modules
            FROM student_enrollments se
            INNER JOIN students s ON se.Student_ID = s.Student_ID
            LEFT JOIN programmes p ON s.Programme_Code = p.Programme_Code
            WHERE ${conditions.join(' AND ')}
            GROUP BY se.Student_ID, se.Semester_Code
        ),
        categorized AS (
            SELECT
                ps.Semester_Code,
                ps.Student_ID,
                CASE
                    WHEN ps.failed_modules = 0 THEN 'Proceed'
                    WHEN ps.failed_modules = 1 THEN 'Repeat'
                    WHEN ps.failed_modules >= 3 OR (ps.failed_modules / NULLIF(ps.total_modules, 0)) > 0.5 THEN 'Excluded'
                    ELSE 'At-Risk'
                END AS status
            FROM per_student_sem ps
        )
        SELECT
            sem.Semester_Code AS semester_code,
            CONCAT(sem.Academic_Year, ' S', sem.Semester_Number) AS semester,
            sem.Academic_Year,
            sem.Semester_Number,
            SUM(CASE WHEN c.status = 'Proceed' THEN 1 ELSE 0 END) AS proceed,
            SUM(CASE WHEN c.status = 'Repeat' THEN 1 ELSE 0 END) AS repeat_module,
            SUM(CASE WHEN c.status = 'At-Risk' THEN 1 ELSE 0 END) AS at_risk,
            SUM(CASE WHEN c.status = 'Excluded' THEN 1 ELSE 0 END) AS excluded,
            COUNT(c.Student_ID) AS total
        FROM semesters sem
        LEFT JOIN categorized c ON c.Semester_Code = sem.Semester_Code
        GROUP BY sem.Semester_Code
        ORDER BY sem.Academic_Year, sem.Semester_Number
    `, params);

    return rows.map(r => ({
        semester_code: r.semester_code,
        semester: r.semester,
        academic_year: Number(r.Academic_Year) || 0,
        semester_number: Number(r.Semester_Number) || 0,
        proceed: Number(r.proceed) || 0,
        repeat_module: Number(r.repeat_module) || 0,
        at_risk: Number(r.at_risk) || 0,
        excluded: Number(r.excluded) || 0,
        total: Number(r.total) || 0
    }));
}

// ============================================
// MODULE DETAIL (single-module analytics)
// ============================================
async function getModuleDetail(moduleCode) {
    if (!moduleCode) throw new Error('Module code required');

    // Base info
    const [base] = await analyticsPool.query(`
        SELECT
            m.Module_Code AS code,
            m.Module_Name AS name,
            UPPER(m.Programme_Code) AS programme,
            UPPER(p.Faculty_Code) AS faculty,
            m.Year_Level AS year_level,
            m.Semester_Offered AS semester_offered,
            m.Credit_Hours AS credit_hours,
            COUNT(se.Enrollment_ID) AS enrolments,
            ROUND(AVG(se.Mark_Obtained), 2) AS avg_mark,
            ROUND(
                (SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) /
                 NULLIF(COUNT(CASE WHEN se.Grade IS NOT NULL THEN 1 END), 0)) * 100,
                2
            ) AS pass_rate
        FROM modules m
        LEFT JOIN programmes p ON m.Programme_Code = p.Programme_Code
        LEFT JOIN student_enrollments se
            ON m.Module_Code = se.Module_Code AND se.Status = 'Completed'
        WHERE m.Module_Code = ?
        GROUP BY m.Module_Code
    `, [moduleCode]);

    if (!base[0]) throw new Error('Module not found');

    const module = base[0];

    // Rank within programme (by pass rate)
    const [rankRows] = await analyticsPool.query(`
        SELECT
            m.Module_Code AS code,
            ROUND(
                (SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) /
                 NULLIF(COUNT(CASE WHEN se.Grade IS NOT NULL THEN 1 END), 0)) * 100,
                2
            ) AS pass_rate
        FROM modules m
        INNER JOIN student_enrollments se
            ON m.Module_Code = se.Module_Code AND se.Status = 'Completed'
        WHERE UPPER(m.Programme_Code) = UPPER(?)
        GROUP BY m.Module_Code
        HAVING COUNT(se.Enrollment_ID) >= 10
        ORDER BY pass_rate DESC
    `, [module.programme]);

    const rankIndex = rankRows.findIndex(r => r.code === moduleCode);
    const rankInProgramme = rankIndex >= 0 ? rankIndex + 1 : null;
    const totalInProgramme = rankRows.length;

    // Pass rate trend per semester
    const [trendRows] = await analyticsPool.query(`
        SELECT
            CONCAT(sem.Academic_Year, ' S', sem.Semester_Number) AS semester,
            sem.Academic_Year,
            sem.Semester_Number,
            COUNT(se.Enrollment_ID) AS enrolments,
            ROUND(
                (SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) /
                 NULLIF(COUNT(CASE WHEN se.Grade IS NOT NULL THEN 1 END), 0)) * 100,
                2
            ) AS passRate,
            ROUND(AVG(se.Mark_Obtained), 2) AS avgMark
        FROM semesters sem
        LEFT JOIN student_enrollments se
            ON sem.Semester_Code = se.Semester_Code
            AND se.Module_Code = ?
            AND se.Status = 'Completed'
        WHERE EXISTS (
            SELECT 1 FROM student_enrollments se2
            WHERE se2.Module_Code = ? AND se2.Semester_Code = sem.Semester_Code
        )
        GROUP BY sem.Semester_Code
        ORDER BY sem.Academic_Year, sem.Semester_Number
    `, [moduleCode, moduleCode]);

    const passRateTrend = trendRows.map(r => ({
        semester: r.semester,
        passRate: Number(r.passRate) || 0,
        avgMark: Number(r.avgMark) || 0,
        enrolments: Number(r.enrolments) || 0
    }));

    // Mark distribution
    const [distRows] = await analyticsPool.query(`
        SELECT Grade AS grade, COUNT(*) AS count
        FROM student_enrollments
        WHERE Module_Code = ? AND Grade IS NOT NULL AND Status = 'Completed'
        GROUP BY Grade
    `, [moduleCode]);

    const distMap = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    distRows.forEach(r => { if (distMap[r.grade] !== undefined) distMap[r.grade] = Number(r.count) || 0; });

    // Programme average mark for difficulty index
    const [progAvg] = await analyticsPool.query(`
        SELECT ROUND(AVG(se.Mark_Obtained), 2) AS prog_avg
        FROM student_enrollments se
        INNER JOIN modules m ON se.Module_Code = m.Module_Code
        WHERE UPPER(m.Programme_Code) = UPPER(?) AND se.Status = 'Completed'
          AND se.Mark_Obtained IS NOT NULL
    `, [module.programme]);

    const programmeAvgMark = Number(progAvg[0]?.prog_avg) || 0;
    const difficultyIndex = Number((Number(module.avg_mark) - programmeAvgMark).toFixed(2));

    // Bottom 5 students (need attention)
    const [bottomStudents] = await analyticsPool.query(`
        SELECT
            se.Student_ID AS id,
            ROUND(se.Mark_Obtained, 2) AS mark,
            se.Grade AS grade,
            (
                SELECT COUNT(*) FROM student_enrollments se2
                WHERE se2.Student_ID = se.Student_ID
                  AND se2.Semester_Code = se.Semester_Code
                  AND se2.Grade = 'F'
            ) AS failed_this_sem
        FROM student_enrollments se
        WHERE se.Module_Code = ?
          AND se.Mark_Obtained IS NOT NULL
          AND se.Status = 'Completed'
        ORDER BY se.Mark_Obtained ASC
        LIMIT 5
    `, [moduleCode]);

    return {
        code: module.code,
        name: module.name,
        programme: module.programme,
        faculty: module.faculty,
        year_level: Number(module.year_level) || 0,
        semester_offered: Number(module.semester_offered) || 0,
        credit_hours: Number(module.credit_hours) || 0,
        enrolments: Number(module.enrolments) || 0,
        avg_mark: Number(module.avg_mark) || 0,
        pass_rate: Number(module.pass_rate) || 0,
        rank_in_programme: rankInProgramme,
        total_modules_in_programme: totalInProgramme,
        programme_avg_mark: programmeAvgMark,
        difficulty_index: difficultyIndex,
        pass_rate_trend: passRateTrend,
        mark_distribution: distMap,
        bottom_students: bottomStudents.map(s => ({
            id: s.id,
            mark: Number(s.mark) || 0,
            grade: s.grade || '—',
            failed_this_sem: Number(s.failed_this_sem) || 0
        }))
    };
}
// ============================================
// TOP / BOTTOM MODULES by pass rate
// ============================================
async function getTopBottomModules(filters = {}) {
    const limit = Number(filters.limit) || 5;
    const minEnrolments = Number(filters.minEnrolments) || 10;

    const conditions = [`se.Status = 'Completed'`];
    const params = [];

    if (filters.programme && filters.programme !== 'all') {
        conditions.push(`UPPER(m.Programme_Code) = UPPER(?)`);
        params.push(filters.programme);
    }
    if (filters.faculty && filters.faculty !== 'all') {
        conditions.push(`UPPER(p.Faculty_Code) = UPPER(?)`);
        params.push(filters.faculty);
    }
    if (filters.semester && filters.semester !== 'all') {
        conditions.push(`se.Semester_Code = ?`);
        params.push(filters.semester);
    }

    const [rows] = await analyticsPool.query(`
        SELECT
            m.Module_Code AS code,
            m.Module_Name AS name,
            UPPER(m.Programme_Code) AS programme,
            COUNT(se.Enrollment_ID) AS enrolments,
            ROUND(
                (SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) /
                 NULLIF(COUNT(CASE WHEN se.Grade IS NOT NULL THEN 1 END), 0)) * 100,
                2
            ) AS passRate,
            ROUND(AVG(se.Mark_Obtained), 2) AS avgMark
        FROM modules m
        INNER JOIN student_enrollments se ON m.Module_Code = se.Module_Code
        LEFT JOIN programmes p ON m.Programme_Code = p.Programme_Code
        WHERE ${conditions.join(' AND ')}
        GROUP BY m.Module_Code
        HAVING enrolments >= ?
        ORDER BY passRate DESC
    `, [...params, minEnrolments]);

    const normalised = rows.map(r => ({
        code: r.code,
        name: r.name,
        programme: r.programme,
        enrolments: Number(r.enrolments) || 0,
        passRate: Number(r.passRate) || 0,
        avgMark: Number(r.avgMark) || 0
    }));

    return {
        top: normalised.slice(0, limit),
        bottom: [...normalised].reverse().slice(0, limit),
        min_enrolments: minEnrolments
    };
}

async function getFailureHotspots(filters = {}) {
    const minEnrolments = Number(filters.minEnrolments) || 10;

    const conditions = [`se.Status = 'Completed'`];
    const params = [];

    if (filters.programme && filters.programme !== 'all') {
        conditions.push(`UPPER(m.Programme_Code) = UPPER(?)`);
        params.push(filters.programme);
    }
    if (filters.faculty && filters.faculty !== 'all') {
        conditions.push(`UPPER(p.Faculty_Code) = UPPER(?)`);
        params.push(filters.faculty);
    }
    if (filters.semester && filters.semester !== 'all') {
        conditions.push(`se.Semester_Code = ?`);
        params.push(filters.semester);
    }

    const [rows] = await analyticsPool.query(`
        SELECT
            m.Module_Code AS code,
            m.Module_Name AS name,
            UPPER(m.Programme_Code) AS programme,
            COUNT(se.Enrollment_ID) AS enrolments,
            ROUND(
                (SUM(CASE WHEN se.Grade = 'F' THEN 1 ELSE 0 END) /
                 NULLIF(COUNT(CASE WHEN se.Grade IS NOT NULL THEN 1 END), 0)) * 100,
                2
            ) AS failureRate,
            ROUND(AVG(se.Mark_Obtained), 2) AS avgMark
        FROM modules m
        INNER JOIN student_enrollments se ON m.Module_Code = se.Module_Code
        LEFT JOIN programmes p ON m.Programme_Code = p.Programme_Code
        WHERE ${conditions.join(' AND ')}
        GROUP BY m.Module_Code
        HAVING enrolments >= ?
        ORDER BY failureRate DESC
    `, [...params, minEnrolments]);

    return rows.map(r => ({
        code: r.code,
        name: r.name,
        programme: r.programme,
        enrolments: Number(r.enrolments) || 0,
        failureRate: Number(r.failureRate) || 0,
        avgMark: Number(r.avgMark) || 0
    }));
}

// ============================================
// STUDENT DETAIL (single-student analytics)
// ============================================
async function getStudentDetail(studentId) {
    if (!studentId) throw new Error('Student ID required');

    // Base info
    const [base] = await analyticsPool.query(`
        SELECT
            s.Student_ID AS id,
            s.Student_Name AS name,
            s.Email_Address AS email,
            UPPER(s.Programme_Code) AS programme,
            UPPER(p.Faculty_Code) AS faculty,
            s.Enrollment_Status AS status,
            s.Year_Enrolled AS year_enrolled,
            ROUND(AVG(se.Mark_Obtained), 2) AS avg_mark,
            ROUND(AVG(CASE se.Grade
                WHEN 'A' THEN 4.0
                WHEN 'B' THEN 3.0
                WHEN 'C' THEN 2.0
                WHEN 'D' THEN 1.0
                WHEN 'F' THEN 0.0
                ELSE NULL END), 2) AS gpa,
            COUNT(se.Enrollment_ID) AS total_modules,
            SUM(CASE WHEN se.Grade = 'F' THEN 1 ELSE 0 END) AS failed_modules,
            SUM(CASE WHEN se.Grade != 'F' AND se.Grade IS NOT NULL THEN 1 ELSE 0 END) AS passed_modules
        FROM students s
        LEFT JOIN programmes p ON s.Programme_Code = p.Programme_Code
        LEFT JOIN student_enrollments se ON s.Student_ID = se.Student_ID AND se.Status = 'Completed'
        WHERE s.Student_ID = ?
        GROUP BY s.Student_ID
    `, [studentId]);

    if (!base[0]) throw new Error('Student not found');
    const student = base[0];

    // Programme average mark
    const [progAvg] = await analyticsPool.query(`
        SELECT ROUND(AVG(se.Mark_Obtained), 2) AS prog_avg
        FROM student_enrollments se
        INNER JOIN students s ON se.Student_ID = s.Student_ID
        WHERE UPPER(s.Programme_Code) = UPPER(?) AND se.Status = 'Completed'
          AND se.Mark_Obtained IS NOT NULL
    `, [student.programme]);

    // University average mark
    const [univAvg] = await analyticsPool.query(`
        SELECT ROUND(AVG(Mark_Obtained), 2) AS univ_avg
        FROM student_enrollments
        WHERE Status = 'Completed' AND Mark_Obtained IS NOT NULL
    `);

    // Marks per semester (chart data)
    const [semesterMarks] = await analyticsPool.query(`
        SELECT
            CONCAT(sem.Academic_Year, ' S', sem.Semester_Number) AS semester,
            sem.Academic_Year,
            sem.Semester_Number,
            ROUND(AVG(se.Mark_Obtained), 2) AS avg_mark,
            COUNT(se.Enrollment_ID) AS modules,
            SUM(CASE WHEN se.Grade = 'F' THEN 1 ELSE 0 END) AS failed,
            ROUND(AVG(CASE se.Grade
                WHEN 'A' THEN 4.0
                WHEN 'B' THEN 3.0
                WHEN 'C' THEN 2.0
                WHEN 'D' THEN 1.0
                WHEN 'F' THEN 0.0
                ELSE NULL END), 2) AS gpa
        FROM student_enrollments se
        INNER JOIN semesters sem ON se.Semester_Code = sem.Semester_Code
        WHERE se.Student_ID = ? AND se.Status = 'Completed' AND se.Mark_Obtained IS NOT NULL
        GROUP BY se.Semester_Code
        ORDER BY sem.Academic_Year, sem.Semester_Number
    `, [studentId]);

    // Failed modules list
    const [failedModules] = await analyticsPool.query(`
        SELECT
            se.Module_Code AS code,
            m.Module_Name AS name,
            CONCAT(sem.Academic_Year, ' S', sem.Semester_Number) AS semester,
            ROUND(se.Mark_Obtained, 2) AS mark,
            se.Grade AS grade
        FROM student_enrollments se
        INNER JOIN modules m ON se.Module_Code = m.Module_Code
        INNER JOIN semesters sem ON se.Semester_Code = sem.Semester_Code
        WHERE se.Student_ID = ? AND se.Grade = 'F' AND se.Status = 'Completed'
        ORDER BY sem.Academic_Year DESC, sem.Semester_Number DESC
    `, [studentId]);

    // Trend calculation: first vs last semester
        // Trend calculation: first vs last semester
    // Trend calculation: only "improving" if the student is actually passing.
    // If they're failing (>50% fails), the trend is contextualised.
      // ---- Trend classification ----
    // Combines absolute performance, failure rate, and mark direction.
    // Avoids the misleading case where a strong student is labelled "declining"
    // for a small dip, or a failing student is labelled "improving" for a small rise.
    let trend = 'stable';
    if (semesterMarks.length >= 2) {
        const first = Number(semesterMarks[0].avg_mark) || 0;
        const last = Number(semesterMarks[semesterMarks.length - 1].avg_mark) || 0;
        const delta = last - first;

        const passRate = student.total_modules > 0
            ? (student.passed_modules / student.total_modules)
            : 0;

        const isFailing = passRate < 0.5 || Number(student.avg_mark) < 50;
        const isStrong = Number(student.avg_mark) >= 65;

        if (isFailing) {
            trend = 'struggling';           // regardless of direction
        } else if (delta > 3 && !isFailing) {
            trend = 'improving';
        } else if (delta < -3 && !isStrong) {
            trend = 'declining';            // only when below "strong" band
        } else {
            trend = 'stable';               // covers small dips for strong students
        }
    }

        // --- Rank within programme + cohort range ---
    const [programmeScores] = await analyticsPool.query(`
        SELECT
            s.Student_ID AS id,
            ROUND(AVG(se.Mark_Obtained), 2) AS avg_mark
        FROM students s
        INNER JOIN student_enrollments se
            ON s.Student_ID = se.Student_ID AND se.Status = 'Completed'
        WHERE UPPER(s.Programme_Code) = UPPER(?)
          AND se.Mark_Obtained IS NOT NULL
        GROUP BY s.Student_ID
        HAVING COUNT(se.Enrollment_ID) >= 3
        ORDER BY avg_mark DESC
    `, [student.programme]);

    const scores = programmeScores.map(r => Number(r.avg_mark) || 0);
    const cohortSize = scores.length;
    const rankIndex = programmeScores.findIndex(r => Number(r.id) === Number(studentId));
    const rank = rankIndex >= 0 ? rankIndex + 1 : null;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const worstScore = scores.length > 0 ? Math.min(...scores) : 0;
    const percentile = cohortSize > 0 && rank
        ? Number((((cohortSize - rank) / cohortSize) * 100).toFixed(1))
        : null;
    return {
        id: student.id,
        name: student.name,
        email: student.email,
        programme: student.programme,
        faculty: student.faculty,
        status: student.status,
        year_enrolled: Number(student.year_enrolled) || null,
        avg_mark: Number(student.avg_mark) || 0,
        gpa: Number(student.gpa) || 0,
        total_modules: Number(student.total_modules) || 0,
        passed_modules: Number(student.passed_modules) || 0,
        failed_modules: Number(student.failed_modules) || 0,
        programme_avg: Number(progAvg[0]?.prog_avg) || 0,
        university_avg: Number(univAvg[0]?.univ_avg) || 0,
        programme_rank: rank,
        programme_cohort: cohortSize,
        programme_best: bestScore,
        programme_worst: worstScore,
        percentile: percentile,
        trend: trend,
        semester_marks: semesterMarks.map(r => ({
            semester: r.semester,
            avg_mark: Number(r.avg_mark) || 0,
            gpa: Number(r.gpa) || 0,
            modules: Number(r.modules) || 0,
            failed: Number(r.failed) || 0
        })),
        failed_modules_list: failedModules.map(r => ({
            code: r.code,
            name: r.name,
            semester: r.semester,
            mark: Number(r.mark) || 0,
            grade: r.grade
        }))
    };
}
// ============================================
// AT-RISK ALERT PANEL (by programme)
// ============================================
async function getAtRiskAlerts(filters = {}) {
    const conditions = [`se.Status = 'Completed'`];
    const params = [];

    if (filters.programme && filters.programme !== 'all') {
        conditions.push(`UPPER(s.Programme_Code) = UPPER(?)`);
        params.push(filters.programme);
    }
    if (filters.faculty && filters.faculty !== 'all') {
        conditions.push(`UPPER(p.Faculty_Code) = UPPER(?)`);
        params.push(filters.faculty);
    }

    const whereClause = conditions.join(' AND ');

    const [rows] = await analyticsPool.query(`
        WITH last_semester AS (
            SELECT se.Student_ID, MAX(se.Semester_Code) AS last_sem
            FROM student_enrollments se
            INNER JOIN students s ON se.Student_ID = s.Student_ID
            LEFT JOIN programmes p ON s.Programme_Code = p.Programme_Code
            WHERE ${whereClause}
            GROUP BY se.Student_ID
        ),
        latest_metrics AS (
            SELECT
                s.Student_ID,
                s.Programme_Code,
                COUNT(se.Enrollment_ID) AS total,
                SUM(CASE WHEN se.Grade = 'F' THEN 1 ELSE 0 END) AS failed
            FROM students s
            INNER JOIN student_enrollments se ON s.Student_ID = se.Student_ID
            INNER JOIN last_semester ls
                ON s.Student_ID = ls.Student_ID AND se.Semester_Code = ls.last_sem
            WHERE se.Status = 'Completed'
            GROUP BY s.Student_ID
        )
        SELECT
            p.Programme_Code AS code,
            p.Programme_Name AS name,
            UPPER(p.Faculty_Code) AS faculty,
            COUNT(DISTINCT lm.Student_ID) AS total_students,
            COUNT(DISTINCT CASE 
                WHEN (lm.failed / NULLIF(lm.total, 0)) >= 0.5 THEN lm.Student_ID
            END) AS at_risk_count,
            ROUND(
                (COUNT(DISTINCT CASE 
                    WHEN (lm.failed / NULLIF(lm.total, 0)) >= 0.5 THEN lm.Student_ID
                END) / NULLIF(COUNT(DISTINCT lm.Student_ID), 0)) * 100,
                2
            ) AS at_risk_pct
        FROM programmes p
        LEFT JOIN latest_metrics lm ON lm.Programme_Code = p.Programme_Code
        GROUP BY p.Programme_Code
        HAVING total_students > 0
        ORDER BY at_risk_pct DESC
    `, params);

    return rows.map(r => ({
        code: r.code,
        name: r.name,
        faculty: r.faculty,
        total_students: Number(r.total_students) || 0,
        at_risk_count: Number(r.at_risk_count) || 0,
        at_risk_pct: Number(r.at_risk_pct) || 0
    }));
}
module.exports = {
    getPassRate,
    getAcademicYear,
    getDashboardKPIs,
    getStudents,
    getModules,
    getProgrammes,
    getFaculties,
    getAtRiskStudents,
    getSemesterTrends,
    getGradeDistribution,
    getGpaTrends,
    getProgressionTrends,
    getTopBottomModules,
    getFailureHotspots,
    getAtRiskAlerts,
    getModuleDetail,
    getStudentDetail      // ← add this
};