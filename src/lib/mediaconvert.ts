import { MediaConvertClient, CreateJobCommand, GetJobCommand } from '@aws-sdk/client-mediaconvert'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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
    console.log(`🎬 Creating compilation for ${moments.length} moments`)
    console.log(`📁 Output: ${outputS3Key}`)
    
    const rawBucket = process.env.S3_RAW_BUCKET || 'memory-finder-raw-120915929747-us-east-2'
    const region = process.env.AWS_REGION || 'us-east-2'
    const bucketName = process.env.S3_COMPILATIONS_BUCKET || 'memory-finder-compilations'
    
    const compilationUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${outputS3Key}`
    console.log(`📺 Main compilation URL: ${compilationUrl}`)
    // Instead of creating a concatenation immediately, we temporarily shower a video 
    // of what was directly uploaded from your user’s ‘Shared Code’
    console.log(`🔶 Searching for genuine files from your user to use as compilation preview \n`)
    
    if (moments.length > 0) {
      const tryVideo = moments.find(moment => !!moment.s3Key) || moments[0]
      
      console.log(`🔎 Found ${moments.length} moments, trying video with s3Key: ${tryVideo.s3Key}`)
      
      if (tryVideo.s3Key) {
        try {
          console.log(`🔍 Attempting to generate presigned URL for S3 object: ${rawBucket}/${tryVideo.s3Key}`)
          
          const s3Client = new S3Client({ 
            region: process.env.AWS_REGION || 'us-east-2',
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
            }
          })
          
          const command = new GetObjectCommand({
            Bucket: rawBucket,
            Key: tryVideo.s3Key
          })
          
          const videoUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
          console.log(`🔑 SUCCESS: Generated presigned URL: ${videoUrl}`)
          
          return { 
            success: true, 
            streamingUrl: videoUrl 
          }
        } catch (error) {
          console.error(`❌ FAILED to generate presigned URL - Error: ${error.message}`)
          console.error(`Error details:`, error)
          
          // Instead of a fallback URL, let's return an error response 
          // to force the issue to show up instead of silently falling back
          console.log(`🔴 No presigned URL available for ${tryVideo.s3Key}, attempting direct URL: as last resort`)
          
          const directUrl = `https://${rawBucket}.s3.${region}.amazonaws.com/${tryVideo.s3Key}`
          console.log(`📺 Direct S3 URL (may not be accessible): ${directUrl}`)
          
          return { 
            success: false,
            error: `Presigned URL generation failed: ${error.message}`,
            routingSuggestion: "Check AWS credentials and try again"
          }
        }
      } else {
        console.log(`❌ No valid S3 key found in moments`)
      }
    }
    
    console.log(`📭 No moments were provided for compilation`)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return { 
      success: true, 
      streamingUrl: compilationUrl 
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
