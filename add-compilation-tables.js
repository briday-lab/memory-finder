const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
})

async function addCompilationTables() {
  const client = await pool.connect()
  
  try {
    console.log('🎬 Adding video compilation tables...')

    // Create video_compilations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS video_compilations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        search_query TEXT NOT NULL,
        compilation_name VARCHAR(255) NOT NULL,
        s3_key VARCHAR(500),
        streaming_url TEXT,
        download_url TEXT,
        duration_seconds DECIMAL,
        moment_count INTEGER DEFAULT 0,
        quality_score DECIMAL DEFAULT 0.8,
        status VARCHAR(50) DEFAULT 'pending',
        job_id VARCHAR(255),
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Created video_compilations table')

    // Create compilation_moments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS compilation_moments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        compilation_id UUID REFERENCES video_compilations(id) ON DELETE CASCADE,
        moment_id UUID REFERENCES video_moments(id) ON DELETE CASCADE,
        start_time_seconds DECIMAL NOT NULL,
        end_time_seconds DECIMAL NOT NULL,
        transition_type VARCHAR(50) DEFAULT 'smooth_cut',
        quality_score DECIMAL DEFAULT 0.8,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Created compilation_moments table')

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_video_compilations_project_id 
      ON video_compilations(project_id)
    `)
    console.log('✅ Created index on video_compilations.project_id')

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_video_compilations_status 
      ON video_compilations(status)
    `)
    console.log('✅ Created index on video_compilations.status')

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_compilation_moments_compilation_id 
      ON compilation_moments(compilation_id)
    `)
    console.log('✅ Created index on compilation_moments.compilation_id')

    // Create trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `)
    console.log('✅ Created update_updated_at_column function')

    await client.query(`
      CREATE TRIGGER update_video_compilations_updated_at 
      BEFORE UPDATE ON video_compilations 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `)
    console.log('✅ Created trigger for video_compilations.updated_at')

    console.log('🎉 All compilation tables created successfully!')
    console.log('')
    console.log('Tables created:')
    console.log('- video_compilations: Stores compilation metadata and status')
    console.log('- compilation_moments: Links compilations to source moments')
    console.log('')
    console.log('Ready for MediaConvert integration! 🎬')

  } catch (error) {
    console.error('❌ Error creating compilation tables:', error)
    throw error
  } finally {
    client.release()
  }
}

async function testCompilationTables() {
  const client = await pool.connect()
  
  try {
    console.log('🧪 Testing compilation tables...')

    // Test video_compilations table
    const compilationsResult = await client.query(`
      SELECT COUNT(*) as count FROM video_compilations
    `)
    console.log(`✅ video_compilations table accessible: ${compilationsResult.rows[0].count} records`)

    // Test compilation_moments table
    const momentsResult = await client.query(`
      SELECT COUNT(*) as count FROM compilation_moments
    `)
    console.log(`✅ compilation_moments table accessible: ${momentsResult.rows[0].count} records`)

    // Test foreign key relationships
    const fkTest = await client.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name IN ('video_compilations', 'compilation_moments')
    `)
    
    console.log('✅ Foreign key relationships:')
    fkTest.rows.forEach(row => {
      console.log(`   ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`)
    })

    console.log('🎉 All compilation table tests passed!')

  } catch (error) {
    console.error('❌ Error testing compilation tables:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run the setup
async function main() {
  try {
    await addCompilationTables()
    await testCompilationTables()
  } catch (error) {
    console.error('Setup failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  main()
}

module.exports = { addCompilationTables, testCompilationTables }
