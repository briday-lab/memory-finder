import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: projectId } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userType = searchParams.get('userType')

    if (!userId || !userType) {
      return NextResponse.json({ error: 'User ID and type are required' }, { status: 400 })
    }

    // Authorization check
    let authorized = false

    if (userType === 'videographer') {
      const projectOwnerCheck = await query(
        'SELECT 1 FROM projects WHERE id = $1 AND videographer_id = $2',
        [projectId, userId]
      )
      if (projectOwnerCheck.rows.length > 0) {
        authorized = true
      }
    } else if (userType === 'couple') {
      const projectInvitationCheck = await query(
        'SELECT 1 FROM project_invitations WHERE project_id = $1 AND couple_id = $2 AND status IN (\'sent\', \'accepted\')',
        [projectId, userId]
      )
      if (projectInvitationCheck.rows.length > 0) {
        authorized = true
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized access to project files' }, { status: 403 })
    }

    // Fetch files for the project
    const filesQuery = `
      SELECT 
        f.id,
        f.file_name,
        f.s3_key,
        f.s3_bucket,
        f.file_size,
        f.file_type,
        f.duration_seconds,
        f.status,
        f.processing_progress,
        f.created_at,
        f.updated_at
      FROM files f
      WHERE f.project_id = $1
      ORDER BY f.created_at DESC
    `

    const result = await query(filesQuery, [projectId])

    return NextResponse.json({ files: result.rows })
  } catch (error) {
    console.error('Error fetching project files:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch project files', 
      details: (error as Error).message 
    }, { status: 500 })
  }
}
