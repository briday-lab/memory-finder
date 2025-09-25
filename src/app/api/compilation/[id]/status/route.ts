import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkCompilationStatus } from '@/lib/mediaconvert'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const compilationId = params.id

    if (!compilationId) {
      return NextResponse.json({ error: 'Compilation ID is required' }, { status: 400 })
    }

    // Get compilation from database
    const compilationResult = await query(
      `SELECT vc.*, p.videographer_id, p.couple_id
       FROM video_compilations vc
       JOIN projects p ON vc.project_id = p.id
       WHERE vc.id = $1`,
      [compilationId]
    )

    if (compilationResult.rows.length === 0) {
      return NextResponse.json({ error: 'Compilation not found' }, { status: 404 })
    }

    const compilation = compilationResult.rows[0]
    const userId = (session.user as { id?: string }).id

    // Check if user has access to this compilation
    if (compilation.videographer_id !== userId && compilation.couple_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check MediaConvert job status if jobId exists
    let statusInfo = { status: 'unknown', progress: 0, error: undefined }
    
    if (compilation.job_id) {
      try {
        statusInfo = await checkCompilationStatus(compilation.job_id)
      } catch (error) {
        console.error('Failed to check job status:', error)
        statusInfo = { 
          status: 'error', 
          progress: 0, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    } else {
      // If no job ID, assume it's completed (simple compilation)
      statusInfo = { status: 'completed', progress: 100 }
    }

    // Update compilation status in database if it changed
    if (statusInfo.status !== compilation.status) {
      await query(
        `UPDATE video_compilations 
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [statusInfo.status, compilationId]
      )
    }

    return NextResponse.json({
      id: compilation.id,
      status: statusInfo.status,
      progress: statusInfo.progress,
      error: statusInfo.error,
      streamingUrl: compilation.streaming_url,
      downloadUrl: compilation.download_url,
      duration: compilation.duration_seconds,
      momentCount: compilation.moment_count,
      createdAt: compilation.created_at,
      updatedAt: compilation.updated_at
    })

  } catch (error: unknown) {
    console.error('Error checking compilation status:', error)
    return NextResponse.json({ 
      error: 'Failed to check compilation status', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
