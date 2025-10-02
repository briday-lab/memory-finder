import { NextRequest, NextResponse } from 'next/server'
import { query } from '../../../../../lib/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const fileId = resolvedParams.id

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    // Check current file status
    const fileResult = await query(
      `SELECT f.status, f.filename, p.project_name,
              COUNT(vm.id) as moments_count
       FROM files f
       JOIN projects p ON f.project_id = p.id
       LEFT JOIN video_moments vm ON f.id = vm.file_id
       WHERE f.id = $1
       GROUP BY f.id, f.status, f.filename, p.project_name`,
      [fileId]
    )

    if (fileResult.rows.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const file = fileResult.rows[0]

    return NextResponse.json({
      fileId,
      status: file.status || 'uploaded',
      filename: file.filename,
      projectName: file.project_name,
      momentsCount: parseInt(file.moments_count) || 0,
      processingProgress: file.status === 'processing' ? Math.floor(Math.random() * 100) : 100,
      completedAt: file.status === 'completed' ? new Date().toISOString() : null
    })

  } catch (error: unknown) {
    console.error('Error fetching file status:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch file status', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

