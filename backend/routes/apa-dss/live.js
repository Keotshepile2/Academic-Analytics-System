const express = require('express');
const router = express.Router();
const analytics = require('../../services/analyticsService');
const mlService = require('../../services/mlService');

// ============================================
// DASHBOARD KPIs
// ============================================
router.get('/dashboard/kpis', async (req, res) => {
    try {
        const data = await analytics.getDashboardKPIs(req.query);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Dashboard KPIs error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================
// CANONICAL PASS RATE (single source of truth)
// ============================================
router.get('/pass-rate', async (req, res) => {
    try {
        const data = await analytics.getPassRate(req.query);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Pass rate error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================
// STUDENTS
// ============================================
router.get('/students', async (req, res) => {
    try {
        const data = await analytics.getStudents(req.query);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Students error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// MODULES
// ============================================
router.get('/modules', async (req, res) => {
    try {
        const data = await analytics.getModules(req.query);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Modules error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PROGRAMMES
// ============================================
router.get('/programmes', async (req, res) => {
    try {
        const data = await analytics.getProgrammes(req.query);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Programmes error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// FACULTIES
// ============================================
router.get('/faculties', async (req, res) => {
    try {
        const data = await analytics.getFaculties();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Faculties error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// AT-RISK STUDENTS - ML-POWERED
// ============================================
router.get('/at-risk', async (req, res) => {
    try {
        console.log('🤖 Fetching ML predictions...');
        const result = await mlService.getPredictions();
        
        let data = result.data || [];
        const { search, risk, programme } = req.query;
        
        if (search) {
            const s = search.toLowerCase();
            data = data.filter(d =>
                (d.name || '').toLowerCase().includes(s) ||
                String(d.id).includes(s)
            );
        }
        if (risk && risk !== 'all') {
            data = data.filter(d => d.riskLevel === risk);
        }
        if (programme && programme !== 'all') {
            data = data.filter(d => d.programme === programme);
        }
        
        res.json({
            success: true,
            data,
            feature_importance: result.feature_importance,
            model_info: result.model_info,
            source: 'ml'
        });
    } catch (error) {
        console.error('❌ ML prediction error:', error.message);
        
        // Fallback to SQL-based predictions
        try {
            console.log('⚠️ Falling back to SQL-based predictions...');
            const data = await analytics.getAtRiskStudents(req.query);
            res.json({
                success: true,
                data,
                source: 'sql_fallback'
            });
        } catch (fallbackError) {
            res.status(500).json({
                success: false,
                error: `ML error: ${error.message}. Fallback error: ${fallbackError.message}`
            });
        }
    }
});

// ============================================
// ML MODEL METRICS
// ============================================
router.get('/ml/metrics', async (req, res) => {
    try {
        const metrics = await mlService.getModelMetrics();
        res.json({ success: true, data: metrics });
    } catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ML MODEL METADATA (feature importance)
// ============================================
router.get('/ml/metadata', async (req, res) => {
    try {
        const metadata = await mlService.getModelMetadata();
        res.json({ success: true, data: metadata });
    } catch (error) {
        console.error('Metadata error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ML RETRAIN (POST)
// ============================================
router.post('/ml/retrain', async (req, res) => {
    try {
        const result = await mlService.retrainModel();
        res.json(result);
    } catch (error) {
        console.error('Retrain error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================
// ML RISK DISTRIBUTION (all students, not just flagged)
// ============================================
router.get('/ml/risk-distribution', async (req, res) => {
    try {
        const result = await mlService.getPredictions();
        const data = result.data || [];

        // Bucket every student by probability
        const buckets = [
            { label: 'Very Low (< 20%)',  min: 0.00, max: 0.20, count: 0, color: '#2ECC71' },
            { label: 'Low (20–40%)',      min: 0.20, max: 0.40, count: 0, color: '#7ED957' },
            { label: 'Medium (40–60%)',   min: 0.40, max: 0.60, count: 0, color: '#F39C12' },
            { label: 'High (60–80%)',     min: 0.60, max: 0.80, count: 0, color: '#E67E22' },
            { label: 'Critical (80%+)',   min: 0.80, max: 1.01, count: 0, color: '#E74C3C' }
        ];

        let high = 0, medium = 0, low = 0;

        data.forEach(s => {
            const p = Number(s.riskProbability) || 0;
            for (const b of buckets) {
                if (p >= b.min && p < b.max) { b.count++; break; }
            }
            if (p >= 0.7) high++;
            else if (p >= 0.4) medium++;
            else low++;
        });

        res.json({
            success: true,
            data: {
                buckets,
                summary: {
                    total: data.length,
                    high,
                    medium,
                    low
                },
                model_info: result.model_info || null
            }
        });
    } catch (error) {
        console.error('Risk distribution error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================
// SEMESTER TRENDS
// ============================================
router.get('/trends', async (req, res) => {
    try {
        const data = await analytics.getSemesterTrends();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Trends error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================
// GPA TRENDS
// ============================================
router.get('/gpa-trends', async (req, res) => {
    try {
        const data = await analytics.getGpaTrends(req.query);
        res.json({ success: true, data });
    } catch (error) {
        console.error('GPA trends error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GRADE DISTRIBUTION
// ============================================
router.get('/grade-distribution', async (req, res) => {
    try {
        const data = await analytics.getGradeDistribution();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Grade distribution error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// REPORTS
// ============================================
router.get('/reports/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { semester, faculty, programme } = req.query;
        
        let data;
        switch (type) {
            case 'summary':
                data = await analytics.getDashboardKPIs();
                break;
            case 'modules':
                data = await analytics.getModules({ semester, faculty, programme });
                break;
            case 'programmes':
                data = await analytics.getProgrammes({ faculty });
                break;
            case 'students':
                data = await analytics.getStudents({ semester, faculty, programme });
                break;
            case 'atrisk':
                data = await analytics.getAtRiskStudents({ semester, faculty, programme });
                break;
            default:
                data = await analytics.getDashboardKPIs();
        }
        
        res.json({ success: true, data });
    } catch (error) {
        console.error('Report error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PROGRESSION TRENDS
// ============================================
router.get('/progression', async (req, res) => {
    try {
        const data = await analytics.getProgressionTrends(req.query);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Progression error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// MODULE DETAIL
// ============================================
router.get('/modules/:code/detail', async (req, res) => {
    try {
        const data = await analytics.getModuleDetail(req.params.code);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Module detail error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// TOP / BOTTOM MODULES
// ============================================
router.get('/modules/top-bottom', async (req, res) => {
    try {
        const data = await analytics.getTopBottomModules(req.query);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Top/bottom modules error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// FAILURE HOTSPOTS
// ============================================
router.get('/failure-hotspots', async (req, res) => {
    try {
        const data = await analytics.getFailureHotspots(req.query);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Failure hotspots error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// AT-RISK ALERTS (by programme)
// ============================================
router.get('/at-risk/alerts', async (req, res) => {
    try {
        const data = await analytics.getAtRiskAlerts(req.query);
        res.json({ success: true, data });
    } catch (error) {
        console.error('At-risk alerts error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// STUDENT DETAIL
// ============================================
router.get('/students/:id/detail', async (req, res) => {
    try {
        const data = await analytics.getStudentDetail(req.params.id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Student detail error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
module.exports = router;