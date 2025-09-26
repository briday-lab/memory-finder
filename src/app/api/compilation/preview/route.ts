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
    const { query: searchQuery, projectId } = body

    if (!searchQuery || !projectId) {
      return NextResponse.json({ 
        error: 'Search query and project ID are required' 
      }, { status: 400 })
    }

    // Find related files for preview
    const filesResult = await query(
      `SELECT f.id, f.filename, f.s3_key, f.proxy_s3_key
       FROM files f
       WHERE f.project_id = $1
       ORDER BY f.created_at DESC`,
      [projectId]
    )

    if (filesResult.rows.length === 0) {
      return NextResponse.json({ 
        preview: [],
        message: 'No files found for this project'
      })
    }

    // For preview, we'll mock up a compilation structure 
    // to show what would be included without generating actual video
    const mockCompilation = {
      id: 'preview-' + Date.now(),
      query: searchQuery,
      totalVideos: filesResult.rows.length,
      estimatedDuration: Math.min(300, filesResult.rows.length * 30), // 30 seconds per file, max 5 min
      sampleMoments: filesResult.rows.slice(0, 5).map((file, idx) => ({
        id: `preview-${file.id}-${idx}`,
        filename: file.filename,
        fileName: file.filename,
        startTime: 0,
        endTime: 30,
        description: `${searchQuery} - ${idx + 1}`,
        confidence: 0.8 + (Math.random() * 0.2) // Mock confidence score
      })),
      previewUrl: null, // Would be actual MediaConvert preview when implemented
      status: 'pending' // Preview mode
    }

    return NextResponse.json({
      success: true,
      preview: mockCompilation
    })

  } catch (error: unknown) {
    console.error('Compilation preview error:', error)
    return NextResponse.json({ 
      error: 'Failed to create preview', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
