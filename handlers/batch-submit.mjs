import { BatchClient, SubmitJobCommand } from '@aws-sdk/client-batch';

const batch = new BatchClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  console.log('BatchSubmit handler received:', JSON.stringify(event, null, 2));
  
  try {
    const { input } = event;
    const { projectId, segments } = input;
    
    // Submit Batch job for embedding generation
    const jobParams = {
      jobName: `embed-segments-${projectId}-${Date.now()}`,
      jobQueue: process.env.BATCH_JOB_QUEUE,
      jobDefinition: process.env.BATCH_JOB_DEFINITION,
      parameters: {
        projectId,
        segments: JSON.stringify(segments)
      },
      containerOverrides: {
        environment: [
          {
            name: 'PROJECT_ID',
            value: projectId
          },
          {
            name: 'SEGMENTS',
            value: JSON.stringify(segments)
          }
        ]
      }
    };
    
    const command = new SubmitJobCommand(jobParams);
    const response = await batch.send(command);
    
    console.log('Batch job submitted:', response.jobId);
    
    return {
      statusCode: 200,
      body: {
        jobId: response.jobId,
        jobName: response.jobName,
        projectId,
        status: 'SUBMITTED'
      }
    };
    
  } catch (error) {
    console.error('BatchSubmit error:', error);
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  }
};
