import { RekognitionClient, DetectFacesCommand } from '@aws-sdk/client-rekognition';

const rekognition = new RekognitionClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  console.log('Faces handler received:', JSON.stringify(event, null, 2));
  
  try {
    const { input } = event;
    const { s3Key, bucket, projectId } = input;
    
    // Detect faces using Rekognition
    const detectFacesParams = {
      Image: {
        S3Object: {
          Bucket: bucket,
          Name: s3Key
        }
      },
      Attributes: ['ALL']
    };
    
    const command = new DetectFacesCommand(detectFacesParams);
    const response = await rekognition.send(command);
    
    const faces = response.FaceDetails?.map(face => ({
      boundingBox: face.BoundingBox,
      confidence: face.Confidence,
      emotions: face.Emotions?.map(emotion => ({
        type: emotion.Type,
        confidence: emotion.Confidence
      })) || [],
      ageRange: face.AgeRange ? {
        low: face.AgeRange.Low,
        high: face.AgeRange.High
      } : null,
      gender: face.Gender ? {
        value: face.Gender.Value,
        confidence: face.Gender.Confidence
      } : null
    })) || [];
    
    console.log('Detected faces:', faces.length);
    
    return {
      statusCode: 200,
      body: {
        faces,
        projectId,
        sourceKey: s3Key
      }
    };
    
  } catch (error) {
    console.error('Faces error:', error);
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  }
};

