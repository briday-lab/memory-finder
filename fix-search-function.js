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

async function fixSearchFunction() {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();
  
  try {
    console.log('Fixing search function...');
    
    const functionSQL = `
      CREATE OR REPLACE FUNCTION search_video_segments(
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
              COALESCE(vm.transcript_text, vm.description, '') as content_text,
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
      $$ LANGUAGE plpgsql;
    `;
    
    await client.query(functionSQL);
    console.log('✅ Search function fixed!');
    
    // Test the function
    const testResult = await client.query(
      `SELECT * FROM search_video_segments('[1,0,0]'::jsonb, '00000000-0000-0000-0000-000000000000'::uuid, 0.1, 5)`
    );
    
    console.log('Test result count:', testResult.rows.length);
    
  } catch (error) {
    console.error('❌ Failed to fix function:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixSearchFunction().catch(console.error);
