-- ============================================
-- APA-DSS Read-Only Database User Setup
-- ============================================
-- This script creates a dedicated read-only user
-- for the APA-DSS analytics system.
-- 
-- Run this script with a SQL Server administrator account.
-- ============================================

-- 1. Drop the user if it already exists (to avoid conflicts)
DROP USER IF EXISTS [apa_dss_user];

-- 2. Create the read-only user with a secure password
-- CHANGE 'your_secure_apa_password_here' to a strong password
CREATE USER [apa_dss_user]
WITH PASSWORD = 'your_secure_apa_password_here';

-- 3. Grant SELECT privileges on all tables in student_record_system
GRANT SELECT ON SCHEMA::dbo TO [apa_dss_user];

-- 4. Apply changes
-- 5. Verify privileges
SELECT dp.name AS principal_name,
			 perm.permission_name,
			 perm.state_desc
FROM sys.database_principals AS dp
LEFT JOIN sys.database_permissions AS perm
	ON perm.grantee_principal_id = dp.principal_id
WHERE dp.name = N'apa_dss_user';

-- ============================================
-- Expected output:
-- GRANT SELECT ON SCHEMA::dbo TO [apa_dss_user]
-- ============================================

-- ============================================
-- Test Queries (Run these to verify read-only access)
-- ============================================
-- SELECT * FROM students LIMIT 5;
-- SELECT * FROM admins;
-- SELECT COUNT(*) FROM student_enrollments;
-- SELECT * FROM modules LIMIT 5;
-- SELECT * FROM programmes;
-- SELECT * FROM faculties;
-- SELECT * FROM semesters;