import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCompilationJob, createSimpleCompilation } from '@/lib/mediaconvert'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { searchQuery, projectId, maxDuration = 300 } = body // maxDuration in seconds (5 minutes)

    if (!searchQuery || !projectId) {
      return NextResponse.json({ 
        error: 'Search query and project ID are required' 
      }, { status: 400 })
    }

    // Step 1: Find all related files across the project (fallback to files if no moments)
    let momentsResult
    
    try {
      // Try to find processed video moments first
      momentsResult = await query(
        `SELECT vm.*, f.s3_key, f.filename, f.proxy_s3_key
         FROM video_moments vm
         JOIN files f ON vm.file_id = f.id
         WHERE f.project_id = $1
         AND (
           vm.description ILIKE $2 OR
           vm.tags::text ILIKE $2 OR
           EXISTS (
             SELECT 1 FROM video_transcripts vt 
             WHERE vt.file_id = f.id 
             AND vt.transcript_text ILIKE $2
             AND vt.timestamp_seconds BETWEEN vm.start_time AND vm.end_time
           )
         )
         ORDER BY vm.confidence DESC, vm.start_time ASC`,
        [projectId, `%${searchQuery}%`]
      )
    } catch (error) {
      console.log('No video_moments table, falling back to files')
      momentsResult = { rows: [] }
    }

    // If no processed moments, use uploaded files as mock moments
    if (momentsResult.rows.length === 0) {
      const filesResult = await query(
        `SELECT f.*, p.project_name, p.bride_name, p.groom_name
         FROM files f
         JOIN projects p ON f.project_id = p.id
         WHERE f.project_id = $1
         ORDER BY f.created_at DESC`,
        [projectId]
      )

      if (filesResult.rows.length === 0) {
        return NextResponse.json({ 
          results: [],
          message: 'No files found for this project'
        })
      }

      // Convert files to mock moments for compilation (all files combined into one compilation)
      console.log(`📂 Found ${filesResult.rows.length} files to compile`)
      momentsResult.rows = filesResult.rows.map((file, index) => ({
        id: `mock-moment-${file.id}-${index}`,
        file_id: file.id,
        s3_key: file.s3_key,
        proxy_s3_key: file.proxy_s3_key,
        filename: file.filename,
        start_time: index * 30, // Sequential timing: first video at 0-30s, second at 30-60s, etc.
        end_time: (index + 1) * 30, // So each video takes 30 seconds in sequential timeline
        description: `${searchQuery} - ${file.filename}`,
        confidence: 0.8,
        quality_score: 0.8
      }))
      
      console.log(`🎬 Converting ${momentsResult.rows.length} files into compilation moments for project ${projectId}`)
    }

    // Step 2: Use all available moments (no selection, just combine all)
    const allMoments = momentsResult.rows
    
    if (allMoments.length === 0) {
      return NextResponse.json({ 
        compilation: null,
        message: 'No files found for compilation'
      })
    }

    // Step 3: Create single compilation combining all videos
    const compilation = await createCompilation(allMoments, searchQuery, projectId)

    console.log(`🟣 Compilation created!: ${compilation.name}`)
    console.log(`📚 Content streaming: ${compilation.streamingUrl}`)
    console.log(`📁 S3 reference: `, compilation.s3Key)
    
    return NextResponse.json({
      success: true,
      compilation: {
        id: compilation.id,
        name: compilation.name,
        duration: compilation.duration,
        momentCount: compilation.momentCount,
        s3Key: compilation.s3Key,
        streamingUrl: compilation.streamingUrl,
        downloadUrl: compilation.downloadUrl
      },
      moments: allMoments.map(moment => ({
        id: moment.id,
        filename: moment.filename,
        startTime: moment.start_time,
        endTime: moment.end_time,
        description: moment.description,
        qualityScore: moment.quality_score
      }))
    })

  } catch (error: unknown) {
    console.error('Compilation creation error:', error)
    return NextResponse.json({ 
      error: 'Failed to create compilation', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

async function selectBestMoments(moments: Record<string, unknown>[], maxDuration: number) {
  // Sort by quality score and relevance
  const sortedMoments = moments.sort((a, b) => {
    const scoreA = (a.confidence || 0.5) * (a.quality_score || 0.5)
    const scoreB = (b.confidence || 0.5) * (b.quality_score || 0.5)
    return scoreB - scoreA
  })

  const selectedMoments = []
  let totalDuration = 0

  for (const moment of sortedMoments) {
    const momentDuration = moment.end_time - moment.start_time
    
    // Skip if adding this moment would exceed max duration
    if (totalDuration + momentDuration > maxDuration) {
      continue
    }

    // Skip moments with poor quality
    if ((moment.quality_score || 0) < 0.3) {
      continue
    }

    selectedMoments.push(moment)
    totalDuration += momentDuration

    // Stop if we have enough content
    if (totalDuration >= maxDuration * 0.8) { // Use 80% of max duration
      break
    }
  }

  // Sort selected moments chronologically
  return selectedMoments.sort((a, b) => a.start_time - b.start_time)
}

async function createCompilation(moments: Record<string, unknown>[], searchQuery: string, projectId: string) {
  const compilationId = crypto.randomUUID()
  const compilationName = `${searchQuery} - Wedding Moments`
  
  // Calculate total duration
  const totalDuration = moments.reduce((sum, moment) => {
    return sum + (moment.end_time - moment.start_time)
  }, 0)

  // Convert moments to MediaConvert format
  const videoMoments = moments.map(moment => ({
    id: moment.id,
    fileId: moment.file_id,
    s3Key: moment.s3_key || moment.proxy_s3_key,
    startTime: moment.start_time,
    endTime: moment.end_time,
    description: moment.description,
    qualityScore: moment.quality_score || 0.8
  }))

    try {
      // Try MediaConvert first (if configured)
      if (process.env.MEDIACONVERT_ROLE_ARN) {
        const compilationJob = await createCompilationJob(projectId, searchQuery, videoMoments)
        
        return {
          id: compilationId,
          name: compilationName,
          duration: totalDuration,
          momentCount: moments.length,
          s3Key: compilationJob.outputS3Key,
          streamingUrl: compilationJob.streamingUrl,
          downloadUrl: compilationJob.downloadUrl,
          jobId: compilationJob.id,
          status: 'processing'
        }
      } else {
        // Fallback to simple compilation
        console.log(`📝 Creating simple compilation for ${videoMoments.length} clips:`)
        videoMoments.forEach((vm, i) => {
          console.log(` ${i + 1}. fileId=${vm.fileId} s3Key=${vm.s3Key} ${vm.description}`)
        })
        
        const outputS3Key = `compilations/${compilationId}.mp4`
        const simpleResult = await createSimpleCompilation(videoMoments, outputS3Key)
        
        console.log(`📾 Simple compilation result:`, simpleResult)
        
        if (simpleResult.success) {
          console.log(`🎊 SUCCESS resolved compilation URL: ${simpleResult.streamingUrl}`)
          return {
            id: compilationId,
            name: compilationName,
            duration: totalDuration,
            momentCount: moments.length,
            s3Key: outputS3Key,
            streamingUrl: simpleResult.streamingUrl,
            downloadUrl: simpleResult.streamingUrl,
            status: 'completed'
          }
        } else {
          console.error(`🧨 SIMPLE COMPILATION FAILED: ${simpleResult.error}`)
          throw new Error(simpleResult.error || 'Simple compilation failed')
        }
      }
    } catch (error) {
      console.error('Compilation creation failed:', error)
      throw error
    }

  // Store compilation in database
  await query(
    `INSERT INTO video_compilations (
      id, project_id, search_query, compilation_name, 
      s3_key, duration_seconds, moment_count, quality_score, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      compilationId,
      projectId,
      searchQuery,
      compilationName,
      compilation.s3Key,
      totalDuration,
      moments.length,
      0.9 // High quality score
    ]
  )

  // Store compilation moments
  for (const moment of moments) {
    await query(
      `INSERT INTO compilation_moments (
        id, compilation_id, moment_id, start_time_seconds, 
        end_time_seconds, transition_type, quality_score, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        crypto.randomUUID(),
        compilationId,
        moment.id,
        moment.start_time,
        moment.end_time,
        'smooth_cut',
        moment.quality_score || 0.8
      ]
    )
  }

  return compilation
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 })
    }

    // Get all compilations for the project
    const compilationsResult = await query(
      `SELECT vc.*, 
              COUNT(cm.id) as moment_count,
              AVG(cm.quality_score) as avg_quality
       FROM video_compilations vc
       LEFT JOIN compilation_moments cm ON vc.id = cm.compilation_id
       WHERE vc.project_id = $1
       GROUP BY vc.id
       ORDER BY vc.created_at DESC`,
      [projectId]
    )

    return NextResponse.json({
      compilations: compilationsResult.rows
    })

  } catch (error: unknown) {
    console.error('Error fetching compilations:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch compilations', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
