-- Memory Finder Database Schema
-- Run this after creating your AWS RDS PostgreSQL instance

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('videographer', 'couple')),
  google_id VARCHAR(255) UNIQUE, -- For Google OAuth users
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  videographer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Optional, can be null initially
  project_name VARCHAR(255) NOT NULL,
  bride_name VARCHAR(255),
  groom_name VARCHAR(255),
  wedding_date DATE,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  s3_bucket VARCHAR(255) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  processing_job_id VARCHAR(255), -- For tracking processing jobs
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Video moments table (for search results)
CREATE TABLE video_moments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  start_time_seconds DECIMAL(10,2) NOT NULL,
  end_time_seconds DECIMAL(10,2) NOT NULL,
  description TEXT,
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  transcript_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_google_id ON users(google_id);

CREATE INDEX idx_projects_videographer_id ON projects(videographer_id);
CREATE INDEX idx_projects_couple_id ON projects(couple_id);
CREATE INDEX idx_projects_status ON projects(status);

CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_status ON files(status);

CREATE INDEX idx_video_moments_file_id ON video_moments(file_id);
CREATE INDEX idx_video_moments_start_time ON video_moments(start_time_seconds);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data (optional - remove in production)
INSERT INTO users (email, name, user_type) VALUES 
('videographer@example.com', 'John Videographer', 'videographer'),
('couple@example.com', 'Julia & Tom', 'couple');

-- Create a sample project
INSERT INTO projects (videographer_id, couple_id, project_name, bride_name, groom_name, wedding_date, description)
SELECT 
    u1.id, 
    u2.id, 
    'Julia & Tom Wedding', 
    'Julia', 
    'Tom', 
    '2024-06-15', 
    'A beautiful summer wedding in the countryside'
FROM users u1, users u2 
WHERE u1.user_type = 'videographer' AND u2.user_type = 'couple'
LIMIT 1;

