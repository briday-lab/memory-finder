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
    
    const expectedTables = ['ai_analysis', 'files', 'processing_jobs', 'projects', 'search_queries', 'search_results', 'users', 'video_moments'];
    const foundTables = tables.rows.map(r => r.table_name);
    
    console.log('Tables found:', foundTables);
    console.log('Expected tables:', expectedTables);
    
    const allTablesExist = expectedTables.every(table => foundTables.includes(table));
    console.log('All expected tables exist:', allTablesExist);
    
    // Test 2: Test cosine similarity function
    console.log('\n2. Testing cosine similarity function...');
    const testEmbedding1 = JSON.stringify([1, 0, 0]);
    const testEmbedding2 = JSON.stringify([1, 0, 0]);
    
    const similarityResult = await client.query(
      `SELECT cosine_similarity($1::jsonb, $2::jsonb) as similarity`,
      [testEmbedding1, testEmbedding2]
    );
    
    console.log('Cosine similarity test result:', similarityResult.rows[0].similarity);
    console.log('Cosine similarity working:', similarityResult.rows[0].similarity === 1);
    
    // Test 3: Test search function (with empty results)
    console.log('\n3. Testing search function...');
    const searchResult = await client.query(
      `SELECT * FROM search_video_segments($1, $2, $3, $4)`,
      [testEmbedding1, '00000000-0000-0000-0000-000000000000', 0.1, 5]
    );
    
    console.log('Search function test - results count:', searchResult.rows.length);
    console.log('Search function working:', true); // No error means it works
    
    // Test 4: Test processing status function (with non-existent file)
    console.log('\n4. Testing processing status function...');
    const statusResult = await client.query(
      `SELECT * FROM get_processing_status($1)`,
      ['00000000-0000-0000-0000-000000000001']
    );
    
    console.log('Processing status test - results count:', statusResult.rows.length);
    console.log('Processing status function working:', true); // No error means it works
    
    // Test 5: Check table structures
    console.log('\n5. Checking table structures...');
    const videoMomentsColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'video_moments' 
      ORDER BY ordinal_position
    `);
    
    const hasEmbeddingData = videoMomentsColumns.rows.some(r => r.column_name === 'embedding_data');
    const hasProjectId = videoMomentsColumns.rows.some(r => r.column_name === 'project_id');
    
    console.log('video_moments has embedding_data column:', hasEmbeddingData);
    console.log('video_moments has project_id column:', hasProjectId);
    
    console.log('\n✅ Database integration test completed!');
    console.log('Summary:');
    console.log('- All tables exist:', allTablesExist);
    console.log('- Cosine similarity function works:', similarityResult.rows[0].similarity === 1);
    console.log('- Search function works:', true);
    console.log('- Processing status function works:', true);
    console.log('- Required columns exist:', hasEmbeddingData && hasProjectId);
    
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

