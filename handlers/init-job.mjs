import { Pool } from 'pg';

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

const pool = new Pool(dbConfig);

export const handler = async (event) => {
  console.log('InitJob handler received:', JSON.stringify(event, null, 2));
  
  const client = await pool.connect();
  
  try {
    const { input } = event;
    const { s3Key, bucket, projectId } = input;
    
    // Extract file ID from S3 key or generate one
    const fileId = input.fileId || `file-${Date.now()}`;
    
    // Create or update file record
    await client.query(
      `INSERT INTO files (
        id, project_id, filename, s3_key, s3_bucket, 
        file_type, status, processing_progress
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        processing_progress = EXCLUDED.processing_progress,
        updated_at = NOW()`,
      [
        fileId,
        projectId,
        s3Key.split('/').pop() || s3Key,
        s3Key,
        bucket,
        s3Key.split('.').pop() || 'mp4',
        'processing',
        0
      ]
    );
    
    // Create processing job record
    const stepFunctionsExecutionArn = input.stepFunctionsExecutionArn || `exec-${Date.now()}`;
    
    await client.query(
      `INSERT INTO processing_jobs (
        file_id, project_id, step_functions_execution_arn,
        status, current_step, progress_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        fileId,
        projectId,
        stepFunctionsExecutionArn,
        'running',
        'initialize',
        5
      ]
    );
    
    console.log('Processing job initialized:', fileId);
    
    return {
      statusCode: 200,
      body: {
        fileId,
        projectId,
        s3Key,
        bucket,
        stepFunctionsExecutionArn,
        status: 'initialized'
      }
    };
    
  } catch (error) {
    console.error('InitJob error:', error);
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  } finally {
    client.release();
  }
};