-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('videographer', 'couple');
CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE moment_type AS ENUM ('speech', 'music', 'ceremony', 'reception', 'other');

-- Users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wedding projects table
CREATE TABLE wedding_projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  videographer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_name VARCHAR(255) NOT NULL,
  wedding_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video files table
CREATE TABLE video_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES wedding_projects(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  duration_seconds INTEGER,
  b2_key VARCHAR(500) NOT NULL,
  b2_url TEXT,
  mime_type VARCHAR(100) NOT NULL,
  processing_status processing_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audio files table
CREATE TABLE audio_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES wedding_projects(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  duration_seconds INTEGER,
  b2_key VARCHAR(500) NOT NULL,
  b2_url TEXT,
  mime_type VARCHAR(100) NOT NULL,
  processing_status processing_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing jobs table
CREATE TABLE processing_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES wedding_projects(id) ON DELETE CASCADE,
  video_file_id UUID REFERENCES video_files(id) ON DELETE CASCADE,
  audio_file_id UUID REFERENCES audio_files(id) ON DELETE SET NULL,
  podrun_job_id VARCHAR(255),
  status processing_status DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video moments table (AI-extracted moments)
CREATE TABLE video_moments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES wedding_projects(id) ON DELETE CASCADE,
  video_file_id UUID REFERENCES video_files(id) ON DELETE CASCADE,
  start_time_seconds DECIMAL(10,3) NOT NULL,
  end_time_seconds DECIMAL(10,3) NOT NULL,
  moment_type moment_type,
  description TEXT,
  confidence_score DECIMAL(3,2),
  transcript TEXT,
  keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search queries table
CREATE TABLE search_queries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES wedding_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search results table
CREATE TABLE search_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  search_query_id UUID REFERENCES search_queries(id) ON DELETE CASCADE,
  moment_id UUID REFERENCES video_moments(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated clips table
CREATE TABLE generated_clips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  search_query_id UUID REFERENCES search_queries(id) ON DELETE CASCADE,
  moment_ids UUID[] NOT NULL,
  clip_filename VARCHAR(255) NOT NULL,
  b2_key VARCHAR(500) NOT NULL,
  b2_url TEXT,
  duration_seconds DECIMAL(10,3),
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_wedding_projects_videographer ON wedding_projects(videographer_id);
CREATE INDEX idx_wedding_projects_couple ON wedding_projects(couple_id);
CREATE INDEX idx_video_files_project ON video_files(project_id);
CREATE INDEX idx_audio_files_project ON audio_files(project_id);
CREATE INDEX idx_processing_jobs_project ON processing_jobs(project_id);
CREATE INDEX idx_video_moments_project ON video_moments(project_id);
CREATE INDEX idx_video_moments_video_file ON video_moments(video_file_id);
CREATE INDEX idx_search_queries_project ON search_queries(project_id);
CREATE INDEX idx_search_results_query ON search_results(search_query_id);
CREATE INDEX idx_generated_clips_query ON generated_clips(search_query_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_clips ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Videographers can see projects they created
CREATE POLICY "Videographers can view their projects" ON wedding_projects
  FOR SELECT USING (auth.uid() = videographer_id);

-- Couples can see projects they're assigned to
CREATE POLICY "Couples can view their projects" ON wedding_projects
  FOR SELECT USING (auth.uid() = couple_id);

-- Project members can view project files
CREATE POLICY "Project members can view video files" ON video_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wedding_projects 
      WHERE id = video_files.project_id 
      AND (videographer_id = auth.uid() OR couple_id = auth.uid())
    )
  );

CREATE POLICY "Project members can view audio files" ON audio_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wedding_projects 
      WHERE id = audio_files.project_id 
      AND (videographer_id = auth.uid() OR couple_id = auth.uid())
    )
  );

-- Project members can view moments
CREATE POLICY "Project members can view moments" ON video_moments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wedding_projects 
      WHERE id = video_moments.project_id 
      AND (videographer_id = auth.uid() OR couple_id = auth.uid())
    )
  );

-- Project members can create search queries
CREATE POLICY "Project members can create search queries" ON search_queries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_projects 
      WHERE id = search_queries.project_id 
      AND (videographer_id = auth.uid() OR couple_id = auth.uid())
    )
  );

-- Project members can view their search queries
CREATE POLICY "Project members can view their search queries" ON search_queries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wedding_projects 
      WHERE id = search_queries.project_id 
      AND (videographer_id = auth.uid() OR couple_id = auth.uid())
    )
  );
