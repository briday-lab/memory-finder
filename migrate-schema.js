const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Database connection
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

async function migrateSchema() {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();
  
  try {
    console.log('Starting database migration...');
    
    // Step 1: Add new columns to existing tables
    console.log('Step 1: Adding new columns to existing tables...');
    
    const alterStatements = [
      // Add new columns to files table
      `ALTER TABLE files ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC(10, 3)`,
      `ALTER TABLE files ADD COLUMN IF NOT EXISTS step_functions_execution_arn VARCHAR(500)`,
      
      // Add new columns to video_moments table (rename to video_segments)
      `ALTER TABLE video_moments ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC(10, 3)`,
      `ALTER TABLE video_moments ADD COLUMN IF NOT EXISTS content_type VARCHAR(50)`,
      `ALTER TABLE video_moments ADD COLUMN IF NOT EXISTS speaker_labels JSONB`,
      `ALTER TABLE video_moments ADD COLUMN IF NOT EXISTS visual_labels JSONB`,
      `ALTER TABLE video_moments ADD COLUMN IF NOT EXISTS face_data JSONB`,
      `ALTER TABLE video_moments ADD COLUMN IF NOT EXISTS shot_data JSONB`,
      `ALTER TABLE video_moments ADD COLUMN IF NOT EXISTS relevance_score NUMERIC(5, 4) DEFAULT 0`,
      `ALTER TABLE video_moments ADD COLUMN IF NOT EXISTS embedding_data JSONB`,
      `ALTER TABLE video_moments ADD COLUMN IF NOT EXISTS thumbnail_s3_key VARCHAR(500)`,
      `ALTER TABLE video_moments ADD COLUMN IF NOT EXISTS proxy_s3_key VARCHAR(500)`,
    ];
    
    for (const statement of alterStatements) {
      try {
        await client.query(statement);
        console.log(`✓ Executed: ${statement}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠ Skipped (already exists): ${statement}`);
        } else {
          console.error(`✗ Failed: ${statement} - ${error.message}`);
        }
      }
    }
    
    // Step 2: Create new tables
    console.log('Step 2: Creating new tables...');
    
    const createTableStatements = [
      // AI Analysis Results table
      `CREATE TABLE IF NOT EXISTS ai_analysis (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        file_id UUID REFERENCES files(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        analysis_type VARCHAR(50) NOT NULL,
        raw_data JSONB,
        processed_data JSONB,
        confidence_score NUMERIC(5, 4),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      
      // Search Queries table
      `CREATE TABLE IF NOT EXISTS search_queries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        query_text TEXT NOT NULL,
        query_embedding_data JSONB,
        results_count INT DEFAULT 0,
        execution_time_ms INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      
      // Search Results table
      `CREATE TABLE IF NOT EXISTS search_results (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        search_query_id UUID REFERENCES search_queries(id) ON DELETE CASCADE,
        video_segment_id UUID REFERENCES video_moments(id) ON DELETE CASCADE,
        rank_position INT NOT NULL,
        relevance_score NUMERIC(5, 4),
        clicked BOOLEAN DEFAULT FALSE,
        clicked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      
      // Processing Jobs table
      `CREATE TABLE IF NOT EXISTS processing_jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        file_id UUID REFERENCES files(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        step_functions_execution_arn VARCHAR(500) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'running',
        current_step VARCHAR(100),
        progress_percentage INT DEFAULT 0,
        error_message TEXT,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    ];
    
    for (const statement of createTableStatements) {
      try {
        await client.query(statement);
        console.log(`✓ Created table`);
      } catch (error) {
        console.log(`⚠ Table already exists or error: ${error.message}`);
      }
    }
    
    // Step 3: Create indexes
    console.log('Step 3: Creating indexes...');
    
    const indexStatements = [
      `CREATE INDEX IF NOT EXISTS idx_ai_analysis_file_id ON ai_analysis(file_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_analysis_project_id ON ai_analysis(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_analysis_type ON ai_analysis(analysis_type)`,
      `CREATE INDEX IF NOT EXISTS idx_video_moments_embedding_data_gin ON video_moments USING gin(embedding_data)`,
      `CREATE INDEX IF NOT EXISTS idx_search_queries_query_embedding_data_gin ON search_queries USING gin(query_embedding_data)`,
      `CREATE INDEX IF NOT EXISTS idx_processing_jobs_file_id ON processing_jobs(file_id)`,
      `CREATE INDEX IF NOT EXISTS idx_processing_jobs_project_id ON processing_jobs(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status)`,
      `CREATE INDEX IF NOT EXISTS idx_search_queries_project_id ON search_queries(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_search_results_search_query_id ON search_results(search_query_id)`,
      `CREATE INDEX IF NOT EXISTS idx_video_moments_content_text_gin ON video_moments USING gin(to_tsvector('english', content_text))`,
    ];
    
    for (const statement of indexStatements) {
      try {
        await client.query(statement);
        console.log(`✓ Created index`);
      } catch (error) {
        console.log(`⚠ Index already exists or error: ${error.message}`);
      }
    }
    
    // Step 4: Create functions
    console.log('Step 4: Creating functions...');
    
    const functionStatements = [
      // Cosine similarity function
      `CREATE OR REPLACE FUNCTION cosine_similarity(a JSONB, b JSONB)
       RETURNS FLOAT AS $$
       DECLARE
           dot_product FLOAT := 0;
           norm_a FLOAT := 0;
           norm_b FLOAT := 0;
           i INTEGER;
       BEGIN
           FOR i IN 1..jsonb_array_length(a) LOOP
               dot_product := dot_product + (a->>(i-1)::FLOAT * b->>(i-1)::FLOAT);
               norm_a := norm_a + (a->>(i-1)::FLOAT * a->>(i-1)::FLOAT);
               norm_b := norm_b + (b->>(i-1)::FLOAT * b->>(i-1)::FLOAT);
           END LOOP;
           
           IF norm_a = 0 OR norm_b = 0 THEN
               RETURN 0;
           END IF;
           
           RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
       END;
       $$ LANGUAGE plpgsql`,
       
      // Search function (using video_moments table)
      `CREATE OR REPLACE FUNCTION search_video_segments(
           query_embedding_data JSONB,
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
               vm.id,
               vm.file_id,
               vm.start_time_seconds,
               vm.end_time_seconds,
               COALESCE(vm.duration_seconds, vm.end_time_seconds - vm.start_time_seconds),
               vm.content,
               COALESCE(vm.content_type, 'speech'),
               vm.confidence_score,
               cosine_similarity(vm.embedding_data, query_embedding_data) as similarity_score,
               vm.thumbnail_s3_key,
               vm.proxy_s3_key
           FROM video_moments vm
           WHERE vm.project_id = project_id_param
               AND vm.embedding_data IS NOT NULL
               AND cosine_similarity(vm.embedding_data, query_embedding_data) > similarity_threshold
           ORDER BY cosine_similarity(vm.embedding_data, query_embedding_data) DESC
           LIMIT max_results;
       END;
       $$ LANGUAGE plpgsql`,
       
      // Processing status function
      `CREATE OR REPLACE FUNCTION get_processing_status(file_id_param UUID)
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
       $$ LANGUAGE plpgsql`
    ];
    
    for (const statement of functionStatements) {
      try {
        await client.query(statement);
        console.log(`✓ Created function`);
      } catch (error) {
        console.error(`✗ Function creation failed: ${error.message}`);
      }
    }
    
    console.log('✅ Database migration completed successfully!');
    
    // Test the migration
    const testResult = await client.query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \'public\'');
    console.log(`📊 Total tables in database: ${testResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
migrateSchema().catch(console.error);

