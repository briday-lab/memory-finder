import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
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
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

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
  console.log('GenerateEmbeddings handler received:', JSON.stringify(event, null, 2));
  
  const client = await pool.connect();
  
  try {
    const { input } = event;
    const { projectId, fileId, aiAnalysisResults } = input;
    
    if (!projectId || !fileId || !aiAnalysisResults) {
      throw new Error('Missing required parameters: projectId, fileId, or aiAnalysisResults');
    }
    
    const segments = [];
    
    // Process transcription results
    if (aiAnalysisResults.transcription) {
      const transcription = aiAnalysisResults.transcription.processed;
      if (transcription.segments) {
        for (const segment of transcription.segments) {
          const segmentText = `${segment.text} (Speaker: ${segment.speaker || 'Unknown'})`;
          const embedding = await generateEmbedding(segmentText);
          
          segments.push({
            startTime: segment.start_time,
            endTime: segment.end_time,
            duration: segment.end_time - segment.start_time,
            content: segment.text,
            type: 'speech',
            confidence: segment.confidence || 0.8,
            embedding: embedding,
            speakerLabels: { speaker: segment.speaker },
            visualLabels: {},
            faceData: {},
            shotData: {}
          });
        }
      }
    }
    
    // Process vision labels
    if (aiAnalysisResults.vision_labels) {
      const labels = aiAnalysisResults.vision_labels.processed;
      if (labels.segments) {
        for (const segment of labels.segments) {
          const labelText = `Visual scene: ${segment.labels.join(', ')}`;
          const embedding = await generateEmbedding(labelText);
          
          segments.push({
            startTime: segment.start_time,
            endTime: segment.end_time,
            duration: segment.end_time - segment.start_time,
            content: labelText,
            type: 'visual',
            confidence: segment.confidence || 0.7,
            embedding: embedding,
            speakerLabels: {},
            visualLabels: { labels: segment.labels },
            faceData: {},
            shotData: {}
          });
        }
      }
    }
    
    // Process face detection
    if (aiAnalysisResults.faces) {
      const faces = aiAnalysisResults.faces.processed;
      if (faces.segments) {
        for (const segment of faces.segments) {
          const faceText = `Faces detected: ${segment.faces.map(f => f.emotions?.join(', ') || 'unknown emotion').join(', ')}`;
          const embedding = await generateEmbedding(faceText);
          
          segments.push({
            startTime: segment.start_time,
            endTime: segment.end_time,
            duration: segment.end_time - segment.start_time,
            content: faceText,
            type: 'faces',
            confidence: segment.confidence || 0.7,
            embedding: embedding,
            speakerLabels: {},
            visualLabels: {},
            faceData: { faces: segment.faces },
            shotData: {}
          });
        }
      }
    }
    
    // Process shot detection
    if (aiAnalysisResults.shots) {
      const shots = aiAnalysisResults.shots.processed;
      if (shots.segments) {
        for (const segment of shots.segments) {
          const shotText = `Shot change: ${segment.shot_type || 'transition'} at ${segment.start_time}s`;
          const embedding = await generateEmbedding(shotText);
          
          segments.push({
            startTime: segment.start_time,
            endTime: segment.end_time,
            duration: segment.end_time - segment.start_time,
            content: shotText,
            type: 'shot',
            confidence: segment.confidence || 0.6,
            embedding: embedding,
            speakerLabels: {},
            visualLabels: {},
            faceData: {},
            shotData: { shot_type: segment.shot_type }
          });
        }
      }
    }
    
    console.log(`Generated ${segments.length} segments with embeddings`);
    
    return {
      statusCode: 200,
      body: {
        segments,
        projectId,
        fileId,
        segmentsCount: segments.length
      }
    };
    
  } catch (error) {
    console.error('GenerateEmbeddings error:', error);
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  } finally {
    client.release();
  }
};

