import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { projectName, brideName, groomName, weddingDate, description } = body

    if (!projectName) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const updateQuery = `
      UPDATE projects 
      SET project_name = $1, 
          bride_name = $2, 
          groom_name = $3, 
          wedding_date = $4, 
          description = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `

    const result = await query(updateQuery, [
      projectName,
      brideName || null,
      groomName || null,
      weddingDate || null,
      description || null,
      id
    ])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ project: result.rows[0] })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Failed to update project', details: { message: (error as Error)?.message } }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // First, delete all files associated with this project
    await query('DELETE FROM files WHERE project_id = $1', [id])

    // Then delete the project
    const result = await query('DELETE FROM projects WHERE id = $1 RETURNING *', [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Failed to delete project', details: { message: (error as Error)?.message } }, { status: 500 })
  }
}