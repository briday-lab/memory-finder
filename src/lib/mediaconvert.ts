import { MediaConvertClient, CreateJobCommand, GetJobCommand } from '@aws-sdk/client-mediaconvert'

const client = new MediaConvertClient({ 
  region: process.env.AWS_REGION || 'us-east-2' 
})

export interface VideoMoment {
  id: string
  fileId: string
  s3Key: string
  startTime: number
  endTime: number
  description: string
  qualityScore: number
}

export interface CompilationJob {
  id: string
  projectId: string
  searchQuery: string
  moments: VideoMoment[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  outputS3Key?: string
  streamingUrl?: string
  downloadUrl?: string
  createdAt: Date
  completedAt?: Date
  error?: string
}

export async function createCompilationJob(
  projectId: string,
  searchQuery: string,
  moments: VideoMoment[]
): Promise<CompilationJob> {
  const jobId = crypto.randomUUID()
  const outputS3Key = `compilations/${jobId}.mp4`
  
  // Create MediaConvert job for video compilation
  const jobSettings = createMediaConvertJobSettings(moments, outputS3Key)
  
  try {
    const command = new CreateJobCommand({
      Role: process.env.MEDIACONVERT_ROLE_ARN,
      Settings: jobSettings,
      JobTemplate: undefined, // We'll create custom settings
      Queue: process.env.MEDIACONVERT_QUEUE_ARN,
      UserMetadata: {
        projectId,
        searchQuery,
        jobId
      }
    })

    await client.send(command)
    
    return {
      id: jobId,
      projectId,
      searchQuery,
      moments,
      status: 'processing',
      outputS3Key,
      streamingUrl: `https://${process.env.S3_COMPILATIONS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${outputS3Key}`,
      downloadUrl: `https://${process.env.S3_COMPILATIONS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${outputS3Key}`,
      createdAt: new Date()
    }
  } catch (error) {
    console.error('MediaConvert job creation failed:', error)
    throw new Error(`Failed to create compilation job: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function getJobStatus(jobId: string): Promise<string> {
  try {
    const command = new GetJobCommand({ Id: jobId })
    const response = await client.send(command)
    return response.Job?.Status || 'UNKNOWN'
  } catch (error) {
    console.error('Failed to get job status:', error)
    return 'UNKNOWN'
  }
}

function createMediaConvertJobSettings(moments: VideoMoment[], outputS3Key: string) {
  // Sort moments chronologically
  const sortedMoments = moments.sort((a, b) => a.startTime - b.startTime)
  
  // Create input files for each moment
  const inputs = sortedMoments.map((moment) => ({
    FileInput: `s3://${process.env.S3_RAW_BUCKET}/${moment.s3Key}`,
    TimecodeSource: 'ZEROBASED',
    VideoSelector: {
      Pid: 1
    },
    AudioSelectors: {
      'Audio Selector 1': {
        Pid: 2
      }
    }
  }))

  // Create output settings for compilation
  const outputSettings = {
    NameModifier: `_compilation_${Date.now()}`,
    ContainerSettings: {
      Container: 'MP4',
      Mp4Settings: {
        CslgAtom: 'INCLUDE',
        FreeSpaceBox: 'EXCLUDE',
        MoovPlacement: 'PROGRESSIVE_DOWNLOAD'
      }
    },
    VideoDescription: {
      CodecSettings: {
        Codec: 'H_264',
        H264Settings: {
          Bitrate: 3000000, // 3 Mbps
          MaxBitrate: 4000000, // 4 Mbps
          QualityTuningLevel: 'SINGLE_PASS',
          RateControlMode: 'QVBR',
          SceneChangeDetect: 'TRANSITION_DETECTION',
          SpatialAdaptiveQuantization: 'ENABLED',
          TemporalAdaptiveQuantization: 'ENABLED'
        }
      },
      Width: 1920,
      Height: 1080,
      ScalingBehavior: 'DEFAULT',
      TimecodeInsertion: 'DISABLED'
    },
    AudioDescriptions: [{
      CodecSettings: {
        Codec: 'AAC',
        AacSettings: {
          Bitrate: 128000,
          CodingMode: 'CODING_MODE_2_0',
          SampleRate: 48000
        }
      },
      AudioSourceName: 'Audio Selector 1'
    }]
  }

  // Create complex filter for concatenation (not used in current implementation)
  // const complexFilter = createConcatenationFilter(sortedMoments.length)

  return {
    Inputs: inputs,
    OutputGroups: [{
      Name: 'File Group',
      OutputGroupSettings: {
        Type: 'FILE_GROUP_SETTINGS',
        FileGroupSettings: {
          Destination: `s3://${process.env.S3_COMPILATIONS_BUCKET}/`
        }
      },
      Outputs: [outputSettings]
    }],
    TimecodeConfig: {
      Source: 'ZEROBASED'
    }
  }
}

function createConcatenationFilter(inputCount: number): string {
  // Create FFmpeg-style concatenation filter
  const inputs = Array.from({ length: inputCount }, (_, i) => `[${i}:v][${i}:a]`)
  const concatFilter = `concat=n=${inputCount}:v=1:a=1[outv][outa]`
  
  return inputs.join('') + concatFilter
}

// Alternative approach using FFmpeg for simpler concatenation
export async function createSimpleCompilation(
  moments: VideoMoment[],
  _outputS3Key: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // This would be implemented with AWS Batch or Lambda
    // For now, return a mock success
    console.log(`Creating simple compilation with ${moments.length} moments`)
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function checkCompilationStatus(jobId: string): Promise<{
  status: string
  progress?: number
  error?: string
}> {
  try {
    // Check MediaConvert job status
    const jobStatus = await getJobStatus(jobId)
    
    switch (jobStatus) {
      case 'SUBMITTED':
      case 'PROGRESSING':
        return { status: 'processing', progress: 50 }
      case 'COMPLETE':
        return { status: 'completed', progress: 100 }
      case 'ERROR':
      case 'CANCELED':
        return { status: 'failed', error: 'Job failed or was canceled' }
      default:
        return { status: 'unknown' }
    }
  } catch (error) {
    return { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
