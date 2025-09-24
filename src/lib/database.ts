import { Pool } from 'pg'

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'memoryfinder',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'MemoryFinder2024!',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
}

// Create a connection pool
const pool = new Pool(dbConfig)

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    client.release()
    console.log('Database connected successfully:', result.rows[0])
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Execute a query
export const query = async (text: string, params?: any[]) => {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Executed query', { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error('Query error:', error)
    throw error
  }
}

// Get a client from the pool
export const getClient = async () => {
  return await pool.connect()
}

// Close the pool (call this when shutting down the app)
export const closePool = async () => {
  await pool.end()
}

export default pool
