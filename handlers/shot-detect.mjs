import { RekognitionClient, DetectLabelsCommand, DetectFacesCommand } from '@aws-sdk/client-rekognition';

const rekognition = new RekognitionClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  console.log('ShotDetect handler received:', JSON.stringify(event, null, 2));
  
  try {
    const { input } = event;
    const { s3Key, bucket, projectId } = input;
    
    // Detect shots/scenes using Rekognition
    const detectLabelsParams = {
      Image: {
        S3Object: {
          Bucket: bucket,
          Name: s3Key
        }
      },
      MaxLabels: 20,
      MinConfidence: 70
    };
    
    const command = new DetectLabelsCommand(detectLabelsParams);
    const response = await rekognition.send(command);
    
    // Mock shot detection - in production, use video analysis
    const shots = [];
    const shotDuration = 5; // seconds per shot
    
    for (let i = 0; i < 20; i++) {
      shots.push({
        startTime: i * shotDuration,
        endTime: (i + 1) * shotDuration,
        confidence: 0.85 + Math.random() * 0.1,
        labels: response.Labels?.slice(0, 3).map(label => ({
          name: label.Name,
          confidence: label.Confidence
        })) || []
      });
    }
    
    console.log('Detected shots:', shots.length);
    
    return {
      statusCode: 200,
      body: {
        shots,
        projectId,
        sourceKey: s3Key
      }
    };
    
  } catch (error) {
    console.error('ShotDetect error:', error);
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  }
};
