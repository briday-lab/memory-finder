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

async function testDatabaseIntegration() {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();
  
  try {
    console.log('Testing database integration...');
    
    // Test 1: Check if all tables exist
    console.log('\n1. Checking table existence...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Tables found:', tables.rows.map(r => r.table_name));
    
    // Test 2: Test cosine similarity function
    console.log('\n2. Testing cosine similarity function...');
    const testEmbedding1 = JSON.stringify([1, 0, 0]);
    const testEmbedding2 = JSON.stringify([1, 0, 0]);
    
    const similarityResult = await client.query(
      `SELECT cosine_similarity($1::jsonb, $2::jsonb) as similarity`,
      [testEmbedding1, testEmbedding2]
    );
    
    console.log('Cosine similarity test result:', similarityResult.rows[0].similarity);
    
    // Test 3: Test search function (with empty results)
    console.log('\n3. Testing search function...');
    const searchResult = await client.query(
      `SELECT * FROM search_video_segments($1, $2, $3, $4)`,
      [testEmbedding1, '00000000-0000-0000-0000-000000000000', 0.1, 5]
    );
    
    console.log('Search function test - results count:', searchResult.rows.length);
    
    // Test 4: Test processing job creation
    console.log('\n4. Testing processing job creation...');
    const testFileId = '00000000-0000-0000-0000-000000000001';
    const testProjectId = '00000000-0000-0000-0000-000000000002';
    
    await client.query(
      `INSERT INTO processing_jobs (
        file_id, project_id, step_functions_execution_arn,
        status, current_step, progress_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [testFileId, testProjectId, 'test-execution-arn', 'running', 'test', 10]
    );
    
    const jobResult = await client.query(
      `SELECT * FROM get_processing_status($1)`,
      [testFileId]
    );
    
    console.log('Processing job test - status:', jobResult.rows[0]?.status);
    
    // Clean up test data
    await client.query('DELETE FROM processing_jobs WHERE file_id = $1', [testFileId]);
    
    console.log('\n✅ All database integration tests passed!');
    
  } catch (error) {
    console.error('❌ Database integration test failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testDatabaseIntegration().catch(console.error);
