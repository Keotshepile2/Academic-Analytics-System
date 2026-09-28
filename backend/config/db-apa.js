const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const apaPool = mysql.createPool({
    host: process.env.APA_DSS_DB_HOST || 'localhost',
    port: process.env.APA_DSS_DB_PORT || 3306,
    user: process.env.APA_DSS_DB_USER || 'apa_dss_user',
    password: process.env.APA_DSS_DB_PASSWORD || 'APA_DSS_2026!',
    database: process.env.APA_DSS_DB_NAME || 'student_record_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
async function testConnection() {
    try {
        const connection = await apaPool.getConnection();
        console.log('✅ APA-DSS: Database connection established successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ APA-DSS: Database connection failed:', error.message);
        return false;
    }
}

// Run test
testConnection();

module.exports = apaPool;