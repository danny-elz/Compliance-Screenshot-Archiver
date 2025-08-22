-- PostgreSQL initialization for CSA development
-- This provides an alternative to DynamoDB for local development

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schedules table (equivalent to DynamoDB Schedules)
CREATE TABLE IF NOT EXISTS schedules (
    schedule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    viewport_width INTEGER DEFAULT 1920,
    viewport_height INTEGER DEFAULT 1080,
    artifact_type VARCHAR(10) DEFAULT 'pdf',
    wait_conditions JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    retention_class VARCHAR(50) DEFAULT 'standard',
    active BOOLEAN DEFAULT true,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Captures table (equivalent to DynamoDB Captures)
CREATE TABLE IF NOT EXISTS captures (
    capture_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES schedules(schedule_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    s3_key TEXT NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    file_size_bytes BIGINT,
    sha256_hash VARCHAR(64) NOT NULL,
    kms_signature TEXT,
    status VARCHAR(20) DEFAULT 'SUCCESS',
    error_message TEXT,
    retention_until TIMESTAMP WITH TIME ZONE,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_active_next_run ON schedules(active, next_run) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_captures_user_id_timestamp ON captures(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_captures_schedule_id_timestamp ON captures(schedule_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_captures_url_timestamp ON captures(url, timestamp);
CREATE INDEX IF NOT EXISTS idx_captures_status ON captures(status);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schedules_updated_at 
    BEFORE UPDATE ON schedules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development
INSERT INTO schedules (user_id, url, cron_expression, timezone, artifact_type) VALUES
    ('admin@test.com', 'https://example.com', '0 9 * * *', 'UTC', 'pdf'),
    ('admin@test.com', 'https://httpbin.org/html', '*/30 * * * *', 'UTC', 'png')
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO csa_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO csa_user;