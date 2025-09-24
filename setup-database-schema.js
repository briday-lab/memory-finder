require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  },
});

async function setupSchema() {
  try {
    console.log('📊 Setting up database schema...');
    
    // Read the schema file
    const schemaSQL = fs.readFileSync('database-schema.sql', 'utf8');
    
    // Execute the schema
    await pool.query(schemaSQL);
    
    console.log('✅ Database schema created successfully!');
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 Created tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (err) {
    console.error('❌ Schema setup failed:', err.message);
  } finally {
    await pool.end();
  }
}

setupSchema();
