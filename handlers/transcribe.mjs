import { TranscribeClient, StartTranscriptionJobCommand } from '@aws-sdk/client-transcribe';

const transcribe = new TranscribeClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  console.log('Transcribe handler received:', JSON.stringify(event, null, 2));
  
  try {
    const { input } = event;
    const { s3Key, bucket, projectId } = input;
    
    const jobName = `transcribe-${projectId}-${Date.now()}`;
    
    const params = {
      TranscriptionJobName: jobName,
      Media: {
        MediaFileUri: `s3://${bucket}/${s3Key}`
      },
      MediaFormat: s3Key.endsWith('.mp4') ? 'mp4' : 'mp3',
      LanguageCode: 'en-US',
      OutputBucketName: process.env.ANALYSIS_BUCKET,
      OutputKey: `${projectId}/transcripts/${jobName}.json`,
      Settings: {
        ShowSpeakerLabels: true,
        MaxSpeakerLabels: 10,
        ShowAlternatives: true,
        MaxAlternatives: 3
      }
    };
    
    const command = new StartTranscriptionJobCommand(params);
    const response = await transcribe.send(command);
    
    console.log('Transcription job started:', response.TranscriptionJob.TranscriptionJobName);
    
    return {
      statusCode: 200,
      body: {
        jobName: response.TranscriptionJob.TranscriptionJobName,
        status: response.TranscriptionJob.TranscriptionJobStatus,
        projectId,
        transcriptKey: `${projectId}/transcripts/${jobName}.json`
      }
    };
    
  } catch (error) {
    console.error('Transcribe error:', error);
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  }
};

