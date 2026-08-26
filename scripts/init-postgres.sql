-- Database bootstrap seed script
-- Baseline schema definition for Equipose local databases

-- Table: Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Application Logs
CREATE TABLE IF NOT EXISTS application_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(50) NOT NULL,
    log_level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Sample Data
-- Insert Users
INSERT INTO users (username, email, full_name, is_active) VALUES
('admin', 'admin@equipose.local', 'System Administrator', TRUE),
('developer', 'developer@equipose.local', 'Lead Developer', TRUE),
('tester', 'tester@equipose.local', 'QA Engineer', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Insert Sessions (linked to existing users)
INSERT INTO sessions (user_id, token, expires_at)
SELECT id, 'mock-token-admin-123456789', CURRENT_TIMESTAMP + INTERVAL '24 hours'
FROM users WHERE username = 'admin'
ON CONFLICT (token) DO NOTHING;

INSERT INTO sessions (user_id, token, expires_at)
SELECT id, 'mock-token-developer-987654321', CURRENT_TIMESTAMP + INTERVAL '24 hours'
FROM users WHERE username = 'developer'
ON CONFLICT (token) DO NOTHING;

-- Insert Application Logs
INSERT INTO application_logs (service_name, log_level, message) VALUES
('auth-service', 'INFO', 'Auth service successfully initialized.'),
('gateway', 'INFO', 'Gateway routing configured for /app1, /app2, and /app3.'),
('db-init', 'INFO', 'Postgres seed script executed successfully.');
