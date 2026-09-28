const mysql = require('mysql2/promise');
require('dotenv').config();

// Main database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_record_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Read-only connection for analytics
const analyticsPool = mysql.createPool({
    host: process.env.APA_DSS_DB_HOST || process.env.DB_HOST || 'localhost',
    port: process.env.APA_DSS_DB_PORT || process.env.DB_PORT || 3306,
    user: process.env.APA_DSS_DB_USER || 'apa_dss_user',
    password: process.env.APA_DSS_DB_PASSWORD || 'APA_DSS_2026!',
    database: process.env.APA_DSS_DB_NAME || process.env.DB_NAME || 'student_record_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connections
async function testConnections() {
    try {
        const conn = await pool.getConnection();
        console.log('✅ Main DB: Connection successful');
        conn.release();
    } catch (error) {
        console.error('❌ Main DB: Connection failed:', error.message);
    }
    
    try {
        const conn = await analyticsPool.getConnection();
        console.log('✅ Analytics DB (Read-Only): Connection successful');
        conn.release();
    } catch (error) {
        console.error('❌ Analytics DB: Connection failed:', error.message);
    }
}

testConnections();

module.exports = { pool, analyticsPool };