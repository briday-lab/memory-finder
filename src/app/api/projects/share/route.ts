import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendProjectInvitationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, coupleEmail, coupleName, message } = body

    if (!projectId || !coupleEmail) {
      return NextResponse.json({ 
        error: 'Project ID and couple email are required' 
      }, { status: 400 })
    }

    // Verify the user is the videographer for this project
    const projectResult = await query(
      `SELECT p.*, u.email as videographer_email, u.name as videographer_name
       FROM projects p
       JOIN users u ON p.videographer_id = u.id
       WHERE p.id = $1 AND u.id = $2`,
      [projectId, (session.user as { id?: string }).id]
    )

    if (projectResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Project not found or you do not have permission to share it' 
      }, { status: 404 })
    }

    const project = projectResult.rows[0]

    // Check if couple already exists
    const coupleResult = await query(
      'SELECT * FROM users WHERE email = $1',
      [coupleEmail]
    )

    let coupleId: string

    if (coupleResult.rows.length === 0) {
      // Create new couple user
      const newCoupleResult = await query(
        `INSERT INTO users (email, name, user_type) 
         VALUES ($1, $2, 'couple') 
         RETURNING id`,
        [coupleEmail, coupleName || coupleEmail.split('@')[0]]
      )
      coupleId = newCoupleResult.rows[0].id
    } else {
      coupleId = coupleResult.rows[0].id
      
      // If user exists but is not a couple, update their type
      if (coupleResult.rows[0].user_type !== 'couple') {
        await query(
          'UPDATE users SET user_type = $1 WHERE id = $2',
          ['couple', coupleId]
        )
      }
    }

    // Update project to link with couple
    await query(
      `UPDATE projects 
       SET couple_id = $1, updated_at = NOW() 
       WHERE id = $2`,
      [coupleId, projectId]
    )

    // Create project invitation record (for tracking and notifications)
    const invitationResult = await query(
      `INSERT INTO project_invitations (
        project_id, videographer_id, couple_id, couple_email, 
        invitation_message, status, invitation_token, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING invitation_token`,
      [
        projectId,
        (session.user as { id?: string }).id,
        coupleId,
        coupleEmail,
        message || `You've been invited to view your wedding video project: ${project.project_name}`,
        'sent',
        crypto.randomUUID()
      ]
    )

    const invitationToken = invitationResult.rows[0].invitation_token

    // Send invitation email
    const emailResult = await sendProjectInvitationEmail({
      videographerName: project.videographer_name,
      videographerEmail: project.videographer_email,
      projectName: project.project_name,
      brideName: project.bride_name,
      groomName: project.groom_name,
      weddingDate: project.wedding_date?.toISOString().split('T')[0] || 'TBD',
      invitationMessage: message,
      invitationToken: invitationToken,
      coupleEmail: coupleEmail,
      coupleName: coupleName
    })

    if (!emailResult.success) {
      console.warn('Failed to send invitation email:', emailResult.error)
      // Don't fail the request if email fails, just log it
    }

    return NextResponse.json({
      success: true,
      message: 'Project shared successfully and invitation sent.',
      coupleId,
      projectId,
      emailSent: emailResult.success,
      emailError: emailResult.error
    })

  } catch (error: unknown) {
    console.error('Project sharing error:', error)
    return NextResponse.json({ 
      error: 'Failed to share project', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 })
    }

    // Get project sharing information
    const sharingResult = await query(
      `SELECT 
        pi.*,
        u.email as couple_email,
        u.name as couple_name,
        u.user_type as couple_type
       FROM project_invitations pi
       JOIN users u ON pi.couple_id = u.id
       WHERE pi.project_id = $1
       ORDER BY pi.created_at DESC`,
      [projectId]
    )

    return NextResponse.json({
      invitations: sharingResult.rows
    })

  } catch (error: unknown) {
    console.error('Get project sharing error:', error)
    return NextResponse.json({ 
      error: 'Failed to get project sharing information', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
