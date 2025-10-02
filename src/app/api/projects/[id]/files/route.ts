import { NextRequest, NextResponse } from 'next/server'
import { query } from '../../../../../lib/database'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
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

    // First, let's check what columns exist in the files table
    console.log('🔍 Checking files table structure...')
    try {
      const tableInfoQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'files' 
        ORDER BY ordinal_position
      `
      const tableInfo = await query(tableInfoQuery, [])
      console.log('📋 Files table columns:', tableInfo.rows)
    } catch (schemaError) {
      console.error('❌ Error checking table schema:', schemaError)
    }

    // Fetch files for the project - using basic query first
    console.log('📁 Fetching files for project:', projectId)
    const filesQuery = `
      SELECT * FROM files WHERE project_id = $1 ORDER BY created_at DESC
    `

    const result = await query(filesQuery, [projectId])
    console.log('📊 Files query result:', result.rows)

    return NextResponse.json({ files: result.rows })
  } catch (error) {
    console.error('Error fetching project files:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch project files', 
      details: (error as Error).message 
    }, { status: 500 })
  }
}
