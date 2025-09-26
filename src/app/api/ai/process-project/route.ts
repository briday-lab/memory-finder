import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, mode = 'intelligent' } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Start the AI processing pipeline for all project files
    const filesResult = await query(
      `SELECT f.*, p.project_name
       FROM files f
       JOIN projects p ON f.project_id = p.id
       WHERE f.project_id = $1
       ORDER BY f.created_at DESC`,
      [projectId]
    )

    if (filesResult.rows.length === 0) {
      return NextResponse.json({ error: 'No files found for this project' }, { status: 404 })
    }

    // Queue files for AI processing
    for (const file of filesResult.rows) {
      // Check if file is already processing
      const existingStatus = await query(
        `SELECT status FROM video_moments WHERE file_id = $1 LIMIT 1`,
        [file.id]
      )

      if (existingStatus.rows.length === 0 || existingStatus.rows[0].status !== 'processing') {
        // Update file status to processing
        await query(
          `UPDATE files SET status = 'processing' WHERE id = $1`,
          [file.id]
        )

        // TODO: Trigger actual AI processing pipeline
        // This will include:
        // 1. Video transcoding to optimize format
        // 2. Face recognition for main characters
        // 3. Scene detection (ceremony, reception, etc.)
        // 4. Emotion detection
        // 5. Audio transcription
        // 6. Feature extraction for search
        console.log(`Queued ${file.filename} for AI processing`)

        // Simulate processing status for now
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return NextResponse.json({
      success: true,
      message: 'AI processing started for all files',
      filesQueued: filesResult.rows.length
    })

  } catch (error: unknown) {
    console.error('AI processing error:', error)
    return NextResponse.json({ 
      error: 'Failed to start AI processing', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
