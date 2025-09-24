import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert';

const mediaconvert = new MediaConvertClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  console.log('MediaConvert handler received:', JSON.stringify(event, null, 2));
  
  try {
    const { input } = event;
    const { s3Key, bucket, projectId } = input;
    
    // Create MediaConvert job for proxy generation
    const jobParams = {
      Role: process.env.MEDIACONVERT_ROLE_ARN,
      Settings: {
        Inputs: [{
          FileInput: `s3://${bucket}/${s3Key}`,
          AudioSelectors: {
            "Audio Selector 1": {
              DefaultSelection: "DEFAULT"
            }
          },
          VideoSelector: {
            ColorSpace: "FOLLOW"
          }
        }],
        OutputGroups: [{
          Name: "Proxy Group",
          OutputGroupSettings: {
            Type: "FILE_GROUP_SETTINGS",
            FileGroupSettings: {
              Destination: `s3://${process.env.PROXIES_BUCKET}/${projectId}/proxies/`
            }
          },
          Outputs: [{
            NameModifier: "_proxy",
            VideoDescription: {
              CodecSettings: {
                Codec: "H_264",
                H264Settings: {
                  RateControlMode: "QVBR",
                  QvbrSettings: {
                    QvbrQualityLevel: 7
                  },
                  MaxBitrate: 2000000,
                  FramerateControl: "INITIALIZE_FROM_SOURCE",
                  FramerateNumerator: 30,
                  FramerateDenominator: 1
                }
              },
              Width: 1280,
              Height: 720
            },
            AudioDescriptions: [{
              CodecSettings: {
                Codec: "AAC",
                AacSettings: {
                  Bitrate: 128000,
                  CodingMode: "CODING_MODE_2_0",
                  SampleRate: 48000
                }
              }
            }]
          }]
        }]
      }
    };
    
    const command = new CreateJobCommand(jobParams);
    const response = await mediaconvert.send(command);
    
    console.log('MediaConvert job created:', response.Job.Id);
    
    return {
      statusCode: 200,
      body: {
        jobId: response.Job.Id,
        status: response.Job.Status,
        projectId,
        proxyKey: `${projectId}/proxies/${s3Key.replace(/\.[^/.]+$/, '')}_proxy.mp4`
      }
    };
    
  } catch (error) {
    console.error('MediaConvert error:', error);
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  }
};
