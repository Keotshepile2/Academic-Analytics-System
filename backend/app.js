const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Session config
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'apa-dss-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 3600000,
        sameSite: 'lax'
    },
    name: 'apa_dss_session'
};

// Auth middleware
function isAuthenticated(req, res, next) {
    if (req.session && req.session.admin) {
        return next();
    }
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    res.redirect('/apa-dss/login');
}

function isNotAuthenticated(req, res, next) {
    if (!req.session || !req.session.admin) {
        return next();
    }
    res.redirect('/apa-dss/dashboard');
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/apa-dss', express.static(path.join(__dirname, '../frontend/apa-dss')));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(session(sessionConfig));

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// ============================================
// LIVE API ROUTES
// ============================================

const liveRoutes = require('./routes/apa-dss/live');
app.use('/api/apa-dss/live', liveRoutes);

// ============================================
// PAGE ROUTES
// ============================================

app.get('/apa-dss/login', isNotAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/apa-dss/pages/login.html'));
});

app.get('/apa-dss/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/apa-dss/pages/dashboard.html'));
});

app.get('/apa-dss/students', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/apa-dss/pages/students.html'));
});

app.get('/apa-dss/modules', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/apa-dss/pages/modules.html'));
});

app.get('/apa-dss/programmes', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/apa-dss/pages/programmes.html'));
});

app.get('/apa-dss/faculties', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/apa-dss/pages/faculties.html'));
});

app.get('/apa-dss/at-risk', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/apa-dss/pages/at-risk.html'));
});

app.get('/apa-dss/reports', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/apa-dss/pages/reports.html'));
});

app.get('/apa-dss/*', isAuthenticated, (req, res) => {
    const page = req.params[0] || 'dashboard';
    res.sendFile(path.join(__dirname, '../frontend/apa-dss/pages', `${page}.html`), (err) => {
        if (err) res.redirect('/apa-dss/dashboard');
    });
});

app.get('/', (req, res) => {
    if (req.session?.admin) {
        res.redirect('/apa-dss/dashboard');
    } else {
        res.redirect('/apa-dss/login');
    }
});

app.listen(PORT, () => {
    console.log('========================================');
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Login: http://localhost:${PORT}/apa-dss/login`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/apa-dss/dashboard`);
    console.log(`📊 Live API Test: http://localhost:${PORT}/api/apa-dss/live/dashboard/kpis`);
    console.log('========================================');
});

module.exports = app;