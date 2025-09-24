import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  console.log('Keyframes handler received:', JSON.stringify(event, null, 2));
  
  try {
    const { input } = event;
    const { s3Key, bucket, projectId } = input;
    
    // Extract keyframes at regular intervals
    const keyframes = [];
    const interval = 10; // seconds
    
    // Mock keyframe extraction - in production, use FFmpeg
    for (let i = 0; i < 30; i++) {
      const timestamp = i * interval;
      const keyframeKey = `${projectId}/keyframes/${s3Key.replace(/\.[^/.]+$/, '')}_${timestamp}s.jpg`;
      keyframes.push({
        key: keyframeKey,
        timestamp,
        url: `s3://${process.env.THUMBNAILS_BUCKET}/${keyframeKey}`,
        confidence: 0.8 + Math.random() * 0.2
      });
    }
    
    console.log('Extracted keyframes:', keyframes.length);
    
    return {
      statusCode: 200,
      body: {
        keyframes,
        projectId,
        sourceKey: s3Key
      }
    };
    
  } catch (error) {
    console.error('Keyframes error:', error);
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  }
};
