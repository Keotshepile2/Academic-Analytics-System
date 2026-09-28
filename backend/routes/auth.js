const express = require('express');
const router = express.Router();

// Import controller
const authController = require('../controllers/authController');

// Login route
router.post('/login', authController.login);

// Logout route
router.post('/logout', authController.logout);

// Get current user
router.get('/me', authController.getMe);

// Check authentication status
router.get('/check', (req, res) => {
    if (req.session && req.session.admin) {
        res.json({ authenticated: true, admin: req.session.admin });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;