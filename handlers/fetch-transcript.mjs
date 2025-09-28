import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  console.log('FetchTranscript handler received:', JSON.stringify(event, null, 2));
  
  try {
    const { input } = event;
    const { transcriptKey, bucket } = input;
    
    // Fetch the completed transcript from S3
    const getObjectParams = {
      Bucket: bucket,
      Key: transcriptKey
    };
    
    const command = new GetObjectCommand(getObjectParams);
    const response = await s3.send(command);
    
    const transcriptData = await response.Body.transformToString();
    const transcript = JSON.parse(transcriptData);
    
    console.log('Fetched transcript:', transcript.results?.transcripts?.[0]?.transcript?.length || 0, 'characters');
    
    return {
      statusCode: 200,
      body: {
        transcript: transcript.results?.transcripts?.[0]?.transcript || '',
        speakerLabels: transcript.results?.speaker_labels?.segments || [],
        alternatives: transcript.results?.alternatives || [],
        projectId: input.projectId
      }
    };
    
  } catch (error) {
    console.error('FetchTranscript error:', error);
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  }
};

