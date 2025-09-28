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
    const { query: searchQuery, projectId, limit = 20 } = body

    if (!searchQuery || !projectId) {
      return NextResponse.json({ 
        error: 'Search query and project ID are required' 
      }, { status: 400 })
    }

    // Get all files from the project
    const filesResult = await query(
      `SELECT f.*, p.project_name, p.bride_name, p.groom_name
       FROM files f
       JOIN projects p ON f.project_id = p.id
       WHERE f.project_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2`,
      [projectId, limit]
    )

    // For now, return all files as "search results" with mock timing
    // In the future, this will be replaced with actual AI-processed video moments
    const mockResults = filesResult.rows.map((file, index) => ({
      id: `mock-${file.id}-${index}`,
      fileId: file.id,
      startTime: 0, // Start from beginning
      endTime: file.duration_seconds || 30, // Use actual duration or default to 30s
      duration: file.duration_seconds || 30,
      content: `Wedding video: ${file.filename}`,
      contentType: 'video',
      confidence: 0.9,
      similarity: 0.8,
      fileName: file.filename,
      fileSize: file.file_size,
      lastModified: file.created_at,
      thumbnailUrl: file.thumbnail_s3_key,
      videoUrl: file.proxy_s3_key || file.s3_key,
      description: `Wedding video from ${file.project_name} - ${file.filename}`
    }))

    return NextResponse.json({
      results: mockResults,
      totalResults: mockResults.length,
      executionTimeMs: 50,
      searchQueryId: `mock-${Date.now()}`,
      message: 'Showing uploaded videos (AI processing coming soon)'
    })

  } catch (error: unknown) {
    console.error('Simple search error:', error)
    return NextResponse.json({ 
      error: 'Search failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

