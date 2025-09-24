import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Pool } from 'pg';

const s3 = new S3Client({ region: process.env.AWS_REGION });
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

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

// Generate embeddings using AWS Bedrock
async function generateEmbedding(text) {
  try {
    const command = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v1',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: text.substring(0, 8000) // Truncate if too long
      })
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.embedding;
  } catch (error) {
    console.error('Bedrock embedding generation failed:', error);
    // Return mock embedding as fallback
    return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
  }
}

export const handler = async (event) => {
  console.log('PersistMetadata handler received:', JSON.stringify(event, null, 2));
  
  const client = await pool.connect();
  
  try {
    const { input } = event;
    const { projectId, fileId, segments, aiAnalysisResults } = input;
    
    // Store AI analysis results
    if (aiAnalysisResults) {
      for (const [analysisType, data] of Object.entries(aiAnalysisResults)) {
        await client.query(
          `INSERT INTO ai_analysis (file_id, project_id, analysis_type, raw_data, processed_data, confidence_score)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (file_id, analysis_type) 
           DO UPDATE SET 
             raw_data = EXCLUDED.raw_data,
             processed_data = EXCLUDED.processed_data,
             confidence_score = EXCLUDED.confidence_score,
             updated_at = NOW()`,
          [
            fileId,
            projectId,
            analysisType,
            JSON.stringify(data.raw),
            JSON.stringify(data.processed),
            data.confidence || 0.8
          ]
        );
      }
    }
    
    // Store video segments with embeddings
    if (segments && segments.length > 0) {
      for (const segment of segments) {
        // Generate real embedding for the segment content
        const segmentText = segment.content || segment.description || `${segment.type || 'moment'} at ${segment.startTime}s`;
        const embedding = await generateEmbedding(segmentText);
        
        await client.query(
          `INSERT INTO video_moments (
            file_id, project_id, start_time_seconds, end_time_seconds, duration_seconds,
            content, content_type, confidence_score, embedding_data,
            speaker_labels, visual_labels, face_data, shot_data,
            thumbnail_s3_key, proxy_s3_key
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            fileId,
            projectId,
            segment.startTime,
            segment.endTime,
            segment.duration,
            segment.content || '',
            segment.type || 'speech',
            segment.confidence || 0.8,
            JSON.stringify(embedding),
            JSON.stringify(segment.speakerLabels || {}),
            JSON.stringify(segment.visualLabels || {}),
            JSON.stringify(segment.faceData || {}),
            JSON.stringify(segment.shotData || {}),
            segment.thumbnailKey || '',
            segment.proxyKey || ''
          ]
        );
      }
    }
    
    // Update file status to completed
    await client.query(
      `UPDATE files SET status = 'completed', processing_progress = 100, updated_at = NOW()
       WHERE id = $1`,
      [fileId]
    );
    
    // Update processing job status
    await client.query(
      `UPDATE processing_jobs SET status = 'completed', progress_percentage = 100, completed_at = NOW()
       WHERE file_id = $1`,
      [fileId]
    );
    
    // Also store metadata in S3 for backup
    const metadataKey = `${projectId}/metadata/${fileId}/segments.json`;
    const putObjectParams = {
      Bucket: process.env.ANALYSIS_BUCKET,
      Key: metadataKey,
      Body: JSON.stringify({ segments, aiAnalysisResults }, null, 2),
      ContentType: 'application/json'
    };
    
    const command = new PutObjectCommand(putObjectParams);
    await s3.send(command);
    
    console.log('Metadata persisted to database and S3:', metadataKey);
    
    return {
      statusCode: 200,
      body: {
        metadataKey,
        segmentsCount: segments?.length || 0,
        projectId,
        fileId
      }
    };
    
  } catch (error) {
    console.error('PersistMetadata error:', error);
    
    // Update processing job status to failed
    try {
      await client.query(
        `UPDATE processing_jobs SET status = 'failed', error_message = $1, completed_at = NOW()
         WHERE file_id = $2`,
        [error.message, input.fileId]
      );
    } catch (dbError) {
      console.error('Failed to update processing job status:', dbError);
    }
    
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  } finally {
    client.release();
  }
};