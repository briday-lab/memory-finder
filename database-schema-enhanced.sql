-- Enhanced Database Schema for Memory Finder AI Pipeline
-- This schema supports vector embeddings, AI analysis results, and semantic search

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table (unchanged)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  user_type VARCHAR(50) NOT NULL, -- 'videographer' or 'couple'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table (unchanged)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  videographer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES users(id) ON DELETE SET NULL,
  project_name VARCHAR(255) NOT NULL,
  bride_name VARCHAR(255),
  groom_name VARCHAR(255),
  wedding_date DATE,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived', 'completed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files table (enhanced for AI pipeline)
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  s3_bucket VARCHAR(255) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  duration_seconds NUMERIC(10, 3), -- Video duration
  status VARCHAR(50) DEFAULT 'uploaded', -- 'uploaded', 'processing', 'completed', 'failed'
  processing_progress INT DEFAULT 0, -- 0-100
  step_functions_execution_arn VARCHAR(500), -- Track pipeline execution
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Analysis Results table
CREATE TABLE ai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL, -- 'transcription', 'vision_labels', 'faces', 'shots', 'keyframes'
  raw_data JSONB, -- Store original AI service response
  processed_data JSONB, -- Cleaned/structured data
  confidence_score NUMERIC(5, 4), -- Overall confidence
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video Segments table (searchable moments)
CREATE TABLE video_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  start_time_seconds NUMERIC(10, 3) NOT NULL,
  end_time_seconds NUMERIC(10, 3) NOT NULL,
  duration_seconds NUMERIC(10, 3) NOT NULL,
  
  -- Content description
  content_text TEXT, -- Transcribed text or description
  content_type VARCHAR(50), -- 'speech', 'visual', 'scene', 'moment'
  
  -- AI Analysis results
  speaker_labels JSONB, -- Speaker identification
  visual_labels JSONB, -- Object/scene detection
  face_data JSONB, -- Face detection and emotions
  shot_data JSONB, -- Shot detection results
  
  -- Search and ranking
  confidence_score NUMERIC(5, 4), -- Overall confidence
  relevance_score NUMERIC(5, 4) DEFAULT 0, -- Search relevance
  embedding VECTOR(1536), -- OpenAI/Bedrock embedding for semantic search
  
  -- Metadata
  thumbnail_s3_key VARCHAR(500), -- Thumbnail image
  proxy_s3_key VARCHAR(500), -- Proxy video segment
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search Queries table (for analytics and improvement)
CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  query_embedding VECTOR(1536), -- Embedding of the search query
  results_count INT DEFAULT 0,
  execution_time_ms INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search Results table (track what users clicked on)
CREATE TABLE search_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_query_id UUID REFERENCES search_queries(id) ON DELETE CASCADE,
  video_segment_id UUID REFERENCES video_segments(id) ON DELETE CASCADE,
  rank_position INT NOT NULL, -- Position in search results
  relevance_score NUMERIC(5, 4), -- Calculated relevance
  clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing Jobs table (track AI pipeline executions)
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  step_functions_execution_arn VARCHAR(500) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  current_step VARCHAR(100),
  progress_percentage INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_videographer_id ON projects(videographer_id);
CREATE INDEX idx_projects_couple_id ON projects(couple_id);
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_status ON files(status);
CREATE INDEX idx_files_step_functions_execution_arn ON files(step_functions_execution_arn);

CREATE INDEX idx_ai_analysis_file_id ON ai_analysis(file_id);
CREATE INDEX idx_ai_analysis_project_id ON ai_analysis(project_id);
CREATE INDEX idx_ai_analysis_type ON ai_analysis(analysis_type);

CREATE INDEX idx_video_segments_file_id ON video_segments(file_id);
CREATE INDEX idx_video_segments_project_id ON video_segments(project_id);
CREATE INDEX idx_video_segments_start_time ON video_segments(start_time_seconds);
CREATE INDEX idx_video_segments_content_type ON video_segments(content_type);
CREATE INDEX idx_video_segments_confidence ON video_segments(confidence_score);

-- Vector similarity search index (using HNSW for fast approximate search)
CREATE INDEX idx_video_segments_embedding ON video_segments 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_search_queries_embedding ON search_queries 
USING hnsw (query_embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_processing_jobs_file_id ON processing_jobs(file_id);
CREATE INDEX idx_processing_jobs_project_id ON processing_jobs(project_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_step_functions_execution_arn ON processing_jobs(step_functions_execution_arn);

CREATE INDEX idx_search_queries_project_id ON search_queries(project_id);
CREATE INDEX idx_search_queries_created_at ON search_queries(created_at);

CREATE INDEX idx_search_results_search_query_id ON search_results(search_query_id);
CREATE INDEX idx_search_results_video_segment_id ON search_results(video_segment_id);

-- Full-text search indexes
CREATE INDEX idx_video_segments_content_text_gin ON video_segments USING gin(to_tsvector('english', content_text));
CREATE INDEX idx_search_queries_query_text_gin ON search_queries USING gin(to_tsvector('english', query_text));

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_analysis_updated_at
    BEFORE UPDATE ON ai_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_segments_updated_at
    BEFORE UPDATE ON video_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_jobs_updated_at
    BEFORE UPDATE ON processing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Functions for semantic search
CREATE OR REPLACE FUNCTION search_video_segments(
    query_embedding VECTOR(1536),
    project_id_param UUID,
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INT DEFAULT 20
)
RETURNS TABLE (
    segment_id UUID,
    file_id UUID,
    start_time_seconds NUMERIC,
    end_time_seconds NUMERIC,
    duration_seconds NUMERIC,
    content_text TEXT,
    content_type VARCHAR,
    confidence_score NUMERIC,
    similarity_score FLOAT,
    thumbnail_s3_key VARCHAR,
    proxy_s3_key VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vs.id,
        vs.file_id,
        vs.start_time_seconds,
        vs.end_time_seconds,
        vs.duration_seconds,
        vs.content_text,
        vs.content_type,
        vs.confidence_score,
        1 - (vs.embedding <=> query_embedding) as similarity_score,
        vs.thumbnail_s3_key,
        vs.proxy_s3_key
    FROM video_segments vs
    WHERE vs.project_id = project_id_param
        AND vs.embedding IS NOT NULL
        AND 1 - (vs.embedding <=> query_embedding) > similarity_threshold
    ORDER BY vs.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to get processing job status
CREATE OR REPLACE FUNCTION get_processing_status(file_id_param UUID)
RETURNS TABLE (
    job_id UUID,
    status VARCHAR,
    current_step VARCHAR,
    progress_percentage INT,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pj.id,
        pj.status,
        pj.current_step,
        pj.progress_percentage,
        pj.error_message,
        pj.started_at,
        pj.completed_at
    FROM processing_jobs pj
    WHERE pj.file_id = file_id_param
    ORDER BY pj.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
