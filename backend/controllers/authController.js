const apaPool = require('../config/db-apa');

async function login(req, res) {
    try {
        const { email, password } = req.body;
        
        console.log('=== LOGIN ATTEMPT ===');
        console.log('Email:', email);
        console.log('Password provided:', password ? 'Yes' : 'No');
        
        if (!email || !password) {
            console.log('❌ Missing email or password');
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('❌ Invalid email format');
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }
        
        console.log('🔍 Querying database for:', email);
        
        const [rows] = await apaPool.query(
            'SELECT Admin_ID, Admin_Name, Email_Address, Password, Faculty_Code FROM admins WHERE Email_Address = ?',
            [email.toLowerCase().trim()]
        );
        
        console.log('📊 Rows found:', rows.length);
        
        if (rows.length === 0) {
            console.log('❌ No admin found with that email');
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const admin = rows[0];
        console.log('👤 Admin found:', admin.Admin_Name);
        console.log('🔑 Password in DB:', admin.Password);
        console.log('🔑 Password provided:', password);
        
        if (admin.Password !== password) {
            console.log('❌ Password mismatch');
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        console.log('✅ Login successful!');
        
        req.session.admin = {
            id: admin.Admin_ID,
            name: admin.Admin_Name,
            email: admin.Email_Address,
            faculty: admin.Faculty_Code
        };
        
        res.json({
            success: true,
            admin: {
                id: admin.Admin_ID,
                name: admin.Admin_Name,
                email: admin.Email_Address,
                faculty: admin.Faculty_Code
            },
            redirect: '/apa-dss/dashboard'
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'An error occurred during login. Please try again.' });
    }
}

function logout(req, res) {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({ error: 'An error occurred during logout.' });
            }
            res.clearCookie('apa_dss_session');
            res.json({ success: true, redirect: '/apa-dss/login' });
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'An error occurred during logout.' });
    }
}

function getMe(req, res) {
    try {
        if (req.session && req.session.admin) {
            res.json({ authenticated: true, admin: req.session.admin });
        } else {
            res.json({ authenticated: false });
        }
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ error: 'An error occurred while fetching user information.' });
    }
}

module.exports = {
    login,
    logout,
    getMe
};