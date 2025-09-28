import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';

const rekognition = new RekognitionClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  console.log('VisionLabels handler received:', JSON.stringify(event, null, 2));
  
  try {
    const { input } = event;
    const { s3Key, bucket, projectId } = input;
    
    // Detect visual labels using Rekognition
    const detectLabelsParams = {
      Image: {
        S3Object: {
          Bucket: bucket,
          Name: s3Key
        }
      },
      MaxLabels: 50,
      MinConfidence: 60
    };
    
    const command = new DetectLabelsCommand(detectLabelsParams);
    const response = await rekognition.send(command);
    
    const labels = response.Labels?.map(label => ({
      name: label.Name,
      confidence: label.Confidence,
      categories: label.Categories?.map(cat => cat.Name) || []
    })) || [];
    
    console.log('Detected labels:', labels.length);
    
    return {
      statusCode: 200,
      body: {
        labels,
        projectId,
        sourceKey: s3Key
      }
    };
    
  } catch (error) {
    console.error('VisionLabels error:', error);
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  }
};

