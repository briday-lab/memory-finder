// Test database connection
const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function testConnection() {
  try {
    console.log('Testing database connection...')
    console.log('Host:', process.env.DB_HOST)
    console.log('Database:', process.env.DB_NAME)
    
    const client = await pool.connect()
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version')
    client.release()
    
    console.log('✅ Database connected successfully!')
    console.log('Current time:', result.rows[0].current_time)
    console.log('PostgreSQL version:', result.rows[0].postgres_version)
    
    // Test tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    console.log('📊 Tables created:')
    tablesResult.rows.forEach(row => {
      console.log('  -', row.table_name)
    })
    
    await pool.end()
    console.log('✅ Connection test completed successfully!')
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.error('Make sure:')
    console.error('1. RDS instance is running')
    console.error('2. Security group allows port 5432')
    console.error('3. Environment variables are set correctly')
    process.exit(1)
  }
}

testConnection()
