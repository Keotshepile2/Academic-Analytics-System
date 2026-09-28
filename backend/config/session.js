const session = require('express-session');
require('dotenv').config();

const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'apa-dss-session-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,  // Set to false for development (HTTP)
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 3600000,
        sameSite: 'lax'
    },
    name: 'apa_dss_session'
};

module.exports = sessionConfig;