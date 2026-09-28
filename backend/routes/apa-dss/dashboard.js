const express = require('express');
const router = express.Router();
const apaPool = require('../../config/db-apa');

// Dashboard KPIs
router.get('/kpis', async (req, res) => {
    try {
        console.log('📊 Dashboard KPIS API called');
        
        // Total Students
        const [students] = await apaPool.query('SELECT COUNT(*) as total FROM students');
        
        // Total Programmes
        const [programmes] = await apaPool.query('SELECT COUNT(*) as total FROM programmes');
        
        // Total Faculties
        const [faculties] = await apaPool.query('SELECT COUNT(*) as total FROM faculties');
        
        // Total Modules
        const [modules] = await apaPool.query('SELECT COUNT(*) as total FROM modules');
        
        // Overall Pass Rate
        const [passRate] = await apaPool.query(`
            SELECT 
                ROUND(
                    (SUM(CASE WHEN Grade != 'F' AND Grade IS NOT NULL THEN 1 ELSE 0 END) / 
                     COUNT(CASE WHEN Grade IS NOT NULL THEN 1 END)) * 100, 2
                ) as pass_rate
            FROM student_enrollments
            WHERE Status = 'Completed'
        `);
        
        // Overall Average Mark
        const [avgMark] = await apaPool.query(`
            SELECT ROUND(AVG(Mark_Obtained), 2) as avg_mark
            FROM student_enrollments
            WHERE Mark_Obtained IS NOT NULL AND Status = 'Completed'
        `);
        
        // At-Risk Students
        const [atRisk] = await apaPool.query(`
            WITH last_semester AS (
                SELECT Student_ID, MAX(Semester_Code) as last_sem
                FROM student_enrollments
                WHERE Status = 'Completed'
                GROUP BY Student_ID
            ),
            failures AS (
                SELECT se.Student_ID, 
                       COUNT(*) as total_count,
                       SUM(CASE WHEN Grade = 'F' THEN 1 ELSE 0 END) as failed_count
                FROM student_enrollments se
                JOIN last_semester ls ON se.Student_ID = ls.Student_ID AND se.Semester_Code = ls.last_sem
                WHERE se.Status = 'Completed'
                GROUP BY se.Student_ID
            )
            SELECT COUNT(*) as at_risk_count
            FROM failures
            WHERE (failed_count / total_count) >= 0.5
        `);
        
        const result = {
            success: true,
            data: {
                total_students: students[0].total || 0,
                total_programmes: programmes[0].total || 0,
                total_faculties: faculties[0].total || 0,
                total_modules: modules[0].total || 0,
                overall_pass_rate: passRate[0].pass_rate || 0,
                overall_failure_rate: 100 - (passRate[0].pass_rate || 0),
                overall_avg_mark: avgMark[0].avg_mark || 0,
                at_risk_students: atRisk[0].at_risk_count || 0
            }
        };
        
        console.log('✅ Dashboard data sent');
        res.json(result);
        
    } catch (error) {
        console.error('❌ Dashboard error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;