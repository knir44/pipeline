-- Task Management API Database Initialization Script
-- PostgreSQL Database Setup

-- Create database if not exists (handled by Docker environment variables)
\c taskmanagement;

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for status and priority
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'in-progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT DEFAULT '',
    status task_status DEFAULT 'pending' NOT NULL,
    priority task_priority DEFAULT 'medium' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO tasks (title, description, status, priority) VALUES 
    ('Setup Development Environment', 'Configure all development tools and dependencies', 'completed', 'high'),
    ('Design Database Schema', 'Create PostgreSQL database structure for the application', 'completed', 'high'),
    ('Implement REST API', 'Build all CRUD endpoints for task management', 'in-progress', 'high'),
    ('Write Unit Tests', 'Create comprehensive test suite for all API endpoints', 'pending', 'medium'),
    ('Setup CI/CD Pipeline', 'Configure GitHub Actions for automated testing and deployment', 'pending', 'medium'),
    ('Docker Configuration', 'Create Docker containers for application and database', 'in-progress', 'high'),
    ('API Documentation', 'Create detailed API documentation with Postman collection', 'pending', 'low'),
    ('Performance Optimization', 'Optimize database queries and API response times', 'pending', 'low')
ON CONFLICT DO NOTHING;

-- Create a view for task statistics
CREATE OR REPLACE VIEW task_statistics AS
SELECT 
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
    COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
    COUNT(*) FILTER (WHERE priority = 'high') as high_priority_tasks,
    COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority_tasks,
    COUNT(*) FILTER (WHERE priority = 'low') as low_priority_tasks,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0), 2
    ) as completion_percentage
FROM tasks;

-- Grant permissions to the application user
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO taskuser;
GRANT SELECT ON task_statistics TO taskuser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO taskuser;

-- Display initial setup confirmation
SELECT 'Database initialization completed successfully!' as message;
SELECT * FROM task_statistics;