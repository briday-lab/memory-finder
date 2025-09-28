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
    
    // Test 4: Test processing status function (with non-existent file)
    console.log('\n4. Testing processing status function...');
    const statusResult = await client.query(
      `SELECT * FROM get_processing_status($1)`,
      ['00000000-0000-0000-0000-000000000001']
    );
    
    console.log('Processing status test - results count:', statusResult.rows.length);
    
    // Test 5: Check if we can insert into search_queries (no foreign key constraints)
    console.log('\n5. Testing search query insertion...');
    const insertResult = await client.query(
      `INSERT INTO search_queries (project_id, query_text, query_embedding_data, results_count)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['00000000-0000-0000-0000-000000000000', 'test query', testEmbedding1, 0]
    );
    
    console.log('Search query inserted with ID:', insertResult.rows[0].id);
    
    // Clean up
    await client.query('DELETE FROM search_queries WHERE id = $1', [insertResult.rows[0].id]);
    console.log('Test data cleaned up');
    
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

