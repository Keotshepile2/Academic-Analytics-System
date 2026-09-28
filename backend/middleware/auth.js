// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.admin) {
        return next();
    }
    // If request is AJAX/API, return 401
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ 
            error: 'Unauthorized. Please log in.' 
        });
    }
    // Otherwise redirect to login page
    res.redirect('/apa-dss/login');
}

// Middleware to check if user is NOT authenticated (for login page)
function isNotAuthenticated(req, res, next) {
    if (!req.session || !req.session.admin) {
        return next();
    }
    // If already logged in, redirect to dashboard
    res.redirect('/apa-dss/dashboard');
}

// Middleware to get current admin info
function getCurrentAdmin(req, res, next) {
    if (req.session && req.session.admin) {
        req.admin = req.session.admin;
    }
    next();
}

module.exports = {
    isAuthenticated,
    isNotAuthenticated,
    getCurrentAdmin
};