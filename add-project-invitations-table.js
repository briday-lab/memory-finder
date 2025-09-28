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

async function addProjectInvitationsTable() {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();
  
  try {
    console.log('Adding project_invitations table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS project_invitations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        videographer_id UUID REFERENCES users(id) ON DELETE CASCADE,
        couple_id UUID REFERENCES users(id) ON DELETE CASCADE,
        couple_email VARCHAR(255) NOT NULL,
        invitation_message TEXT,
        status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'accepted', 'declined', 'expired'
        invitation_token VARCHAR(255) UNIQUE, -- For secure invitation links
        expires_at TIMESTAMP WITH TIME ZONE,
        accepted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    await client.query(createTableSQL);
    console.log('✅ project_invitations table created');
    
    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_invitations_videographer_id ON project_invitations(videographer_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_invitations_couple_id ON project_invitations(couple_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_invitations_couple_email ON project_invitations(couple_email)',
      'CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status)',
      'CREATE INDEX IF NOT EXISTS idx_project_invitations_invitation_token ON project_invitations(invitation_token)'
    ];
    
    for (const indexSQL of indexes) {
      await client.query(indexSQL);
      console.log('✓ Created index');
    }
    
    // Add trigger for updated_at
    const triggerSQL = `
      CREATE TRIGGER update_project_invitations_updated_at
      BEFORE UPDATE ON project_invitations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `;
    
    await client.query(triggerSQL);
    console.log('✓ Added updated_at trigger');
    
    console.log('✅ project_invitations table setup complete!');
    
  } catch (error) {
    console.error('❌ Failed to create project_invitations table:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
addProjectInvitationsTable().catch(console.error);

