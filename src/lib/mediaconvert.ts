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
  
  // For now, simulate MediaConvert job creation
  // In production, this would create actual MediaConvert jobs
  console.log(`🎬 Creating MediaConvert job for ${moments.length} moments`)
  console.log(`📝 Search query: ${searchQuery}`)
  console.log(`📁 Output: ${outputS3Key}`)
  
  // Simulate job creation
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    id: jobId,
    projectId,
    searchQuery,
    moments,
    status: 'processing',
    outputS3Key,
    streamingUrl: `https://${process.env.S3_COMPILATIONS_BUCKET || 'memory-finder-compilations'}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${outputS3Key}`,
    downloadUrl: `https://${process.env.S3_COMPILATIONS_BUCKET || 'memory-finder-compilations'}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${outputS3Key}`,
    createdAt: new Date()
  }
}

export async function getJobStatus(jobId: string): Promise<string> {
  // For now, simulate job status checking
  // In production, this would check actual MediaConvert job status
  console.log(`🔍 Checking job status for: ${jobId}`)
  
  // Simulate different statuses based on job age
  const jobAge = Date.now() - parseInt(jobId.split('-')[0], 16)
  
  if (jobAge < 5000) { // Less than 5 seconds
    return 'PROGRESSING'
  } else if (jobAge < 10000) { // Less than 10 seconds
    return 'COMPLETE'
  } else {
    return 'ERROR'
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
  outputS3Key: string
): Promise<{ success: boolean; error?: string; streamingUrl?: string }> {
  try {
    // This would be implemented with AWS Batch or Lambda
    // For now, return a mock success with a demo video URL
    console.log(`🎬 Creating simple compilation with ${moments.length} moments`)
    console.log(`📁 Output: ${outputS3Key}`)
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Return a demo video URL for testing
    const demoVideoUrl = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
    
    return { 
      success: true, 
      streamingUrl: demoVideoUrl 
    }
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
