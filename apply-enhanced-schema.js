const { Pool } = require('pg');
const fs = require('fs');
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

async function applySchema() {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();
  
  try {
    console.log('Applying enhanced database schema...');
    
    // Read the schema file
    const schemaSQL = fs.readFileSync('./database-schema-rds.sql', 'utf8');
    
    // Split into individual statements (rough approach)
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await client.query(statement);
          console.log(`✓ Statement ${i + 1} executed successfully`);
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('relation') && error.message.includes('already exists')) {
            console.log(`⚠ Statement ${i + 1} skipped (already exists): ${error.message}`);
          } else {
            console.error(`✗ Statement ${i + 1} failed:`, error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Enhanced database schema applied successfully!');
    
    // Test the schema by running a simple query
    const testResult = await client.query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \'public\'');
    console.log(`📊 Total tables in database: ${testResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Schema application failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the schema application
applySchema().catch(console.error);
