import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userType = searchParams.get('userType')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    let projectsQuery = ''
    let params: (string | number)[] = []

    if (userType === 'videographer') {
      // Videographers see all their projects
      projectsQuery = `
        SELECT p.*, 
               COUNT(f.id) as file_count,
               COUNT(CASE WHEN f.status = 'completed' THEN 1 END) as processed_files
        FROM projects p
        LEFT JOIN files f ON p.id = f.project_id
        WHERE p.videographer_id = $1
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `
      params = [userId]
    } else if (userType === 'couple') {
      // Couples see projects they have been invited to (via project_invitations table)
      projectsQuery = `
        SELECT DISTINCT p.*, 
               COUNT(f.id) as file_count,
               COUNT(CASE WHEN f.status = 'completed' THEN 1 END) as processed_files
        FROM projects p
        INNER JOIN project_invitations pi ON pi.project_id = p.id
        LEFT JOIN files f ON p.id = f.project_id
        WHERE pi.couple_id = $1 AND pi.status IN ('sent', 'accepted')
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `
      params = [userId]
    } else {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 400 })
    }

    const result = await query(projectsQuery, params)
    
    return NextResponse.json({ projects: result.rows })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects', details: { message: (error as Error)?.message } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videographerId, projectName, brideName, groomName, weddingDate, description } = body

    if (!videographerId || !projectName) {
      return NextResponse.json({ error: 'Videographer ID and project name are required' }, { status: 400 })
    }

    const insertQuery = `
      INSERT INTO projects (videographer_id, project_name, bride_name, groom_name, wedding_date, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `

    const result = await query(insertQuery, [
      videographerId,
      projectName,
      brideName || null,
      groomName || null,
      weddingDate || null,
      description || null
    ])

    return NextResponse.json({ project: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project', details: { message: (error as Error)?.message } }, { status: 500 })
  }
}
