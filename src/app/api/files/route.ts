import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const result = await query(
      `SELECT f.*, p.project_name, p.bride_name, p.groom_name
       FROM files f
       JOIN projects p ON f.project_id = p.id
       WHERE f.project_id = $1
       ORDER BY f.created_at DESC`,
      [projectId]
    )

    return NextResponse.json({ files: result.rows })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}
