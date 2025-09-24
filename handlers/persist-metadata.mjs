import { Pool } from 'pg'
export const handler = async (event) => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  })
  try {
    console.log('Persisting metadata', JSON.stringify(event))
    // Example: await pool.query('INSERT INTO segment_features(...) VALUES (...)')
    return { ok: true }
  } finally { await pool.end() }
}
