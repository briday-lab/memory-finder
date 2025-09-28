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

async function fixCosineFunction() {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();
  
  try {
    console.log('Fixing cosine similarity function...');
    
    const functionSQL = `
      CREATE OR REPLACE FUNCTION cosine_similarity(a JSONB, b JSONB)
      RETURNS FLOAT AS $$
      DECLARE
          dot_product FLOAT := 0;
          norm_a FLOAT := 0;
          norm_b FLOAT := 0;
          i INTEGER;
      BEGIN
          FOR i IN 1..jsonb_array_length(a) LOOP
              dot_product := dot_product + ((a->>(i-1))::FLOAT * (b->>(i-1))::FLOAT);
              norm_a := norm_a + ((a->>(i-1))::FLOAT * (a->>(i-1))::FLOAT);
              norm_b := norm_b + ((b->>(i-1))::FLOAT * (b->>(i-1))::FLOAT);
          END LOOP;
          
          IF norm_a = 0 OR norm_b = 0 THEN
              RETURN 0;
          END IF;
          
          RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await client.query(functionSQL);
    console.log('✅ Cosine similarity function fixed!');
    
    // Test the function
    const testResult = await client.query(
      `SELECT cosine_similarity('[1,0,0]'::jsonb, '[1,0,0]'::jsonb) as similarity`
    );
    
    console.log('Test result:', testResult.rows[0].similarity);
    
  } catch (error) {
    console.error('❌ Failed to fix function:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixCosineFunction().catch(console.error);

