import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify the user owns this project
    const projectResult = await query(
      'SELECT videographer_id FROM projects WHERE id = $1',
      [id]
    )

    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (projectResult.rows[0].videographer_id !== (session.user as { id?: string }).id) {
      return NextResponse.json({ error: 'Unauthorized to delete this project' }, { status: 403 })
    }

    // Delete the project (cascade will handle related records)
    await query('DELETE FROM projects WHERE id = $1', [id])

    return NextResponse.json({ 
      success: true, 
      message: 'Project deleted successfully' 
    })

  } catch (error: unknown) {
    console.error('Delete project error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete project', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { project_name, bride_name, groom_name, wedding_date, description, status } = body

    // Verify the user owns this project
    const projectResult = await query(
      'SELECT videographer_id FROM projects WHERE id = $1',
      [id]
    )

    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (projectResult.rows[0].videographer_id !== (session.user as { id?: string }).id) {
      return NextResponse.json({ error: 'Unauthorized to update this project' }, { status: 403 })
    }

    // Update the project
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (project_name !== undefined) {
      updateFields.push(`project_name = $${paramIndex++}`)
      updateValues.push(project_name)
    }
    if (bride_name !== undefined) {
      updateFields.push(`bride_name = $${paramIndex++}`)
      updateValues.push(bride_name)
    }
    if (groom_name !== undefined) {
      updateFields.push(`groom_name = $${paramIndex++}`)
      updateValues.push(groom_name)
    }
    if (wedding_date !== undefined) {
      updateFields.push(`wedding_date = $${paramIndex++}`)
      updateValues.push(wedding_date)
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`)
      updateValues.push(description)
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`)
      updateValues.push(status)
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(id)

    const updateQuery = `
      UPDATE projects 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await query(updateQuery, updateValues)

    return NextResponse.json({ 
      success: true, 
      message: 'Project updated successfully',
      project: result.rows[0]
    })

  } catch (error: unknown) {
    console.error('Update project error:', error)
    return NextResponse.json({ 
      error: 'Failed to update project', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
