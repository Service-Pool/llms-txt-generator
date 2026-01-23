-- Initialize database
-- This file is executed only once on first MySQL container startup

CREATE DATABASE IF NOT EXISTS `${DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- User is already created by MYSQL_USER env var, just grant privileges
GRANT ALL PRIVILEGES ON `${DB_NAME}`.* TO '${DB_USER}'@'%';
FLUSH PRIVILEGES;

SELECT 'Database initialization complete!' AS '';
