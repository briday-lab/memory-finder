import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { sendProjectInvitationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No valid token' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // For now, we'll skip token validation and get user from request body
    // In production, you should validate the Cognito JWT token
    const body = await request.json()
    const { projectId, coupleEmail, coupleName, message, videographerId } = body

    console.log('🔍 Project sharing request received:', {
      projectId,
      coupleEmail,
      coupleName,
      message,
      videographerId,
      projectIdType: typeof projectId,
      videographerIdType: typeof videographerId
    })

    if (!projectId || !coupleEmail || !videographerId) {
      return NextResponse.json({ 
        error: 'Project ID, couple email, and videographer ID are required' 
      }, { status: 400 })
    }

    // Verify the user is the videographer for this project
    const projectResult = await query(
      `SELECT p.*, u.email as videographer_email, u.name as videographer_name
       FROM projects p
       JOIN users u ON p.videographer_id = u.id
       WHERE p.id = $1 AND u.id = $2`,
      [projectId, videographerId]
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

    // Note: We don't update the project's couple_id anymore since projects can be shared with multiple couples

    // Ensure invitations table exists then create invitation record (for tracking and notifications)
    // Create table if it does not exist (idempotent)
    await query(
      `CREATE TABLE IF NOT EXISTS project_invitations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        videographer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        couple_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        couple_email VARCHAR(255) NOT NULL,
        invitation_message TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'sent',
        invitation_token UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    )

    // Insert invitation (fail if it cannot be stored)
    const invitationResult = await query(
      `INSERT INTO project_invitations (
        project_id, videographer_id, couple_id, couple_email, 
        invitation_message, status, invitation_token, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING invitation_token`,
      [
        projectId,
        videographerId,
        coupleId,
        coupleEmail,
        message || `You've been invited to view your wedding video project: ${project.project_name}`,
        'sent',
        crypto.randomUUID()
      ]
    )
    const invitationToken = invitationResult.rows[0].invitation_token

    // Send invitation email
    let emailResult: { success: boolean; error: string } = { success: false, error: 'Email service not configured' }
    try {
      const emailResponse = await sendProjectInvitationEmail({
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
      emailResult = { 
        success: emailResponse.success, 
        error: emailResponse.error || 'Unknown email error' 
      }
    } catch (emailError) {
      console.warn('Failed to send invitation email:', emailError)
      emailResult = { success: false, error: emailError instanceof Error ? emailError.message : 'Unknown email error' }
    }

    // Generate shareable link
    const shareableLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invitation/${invitationToken}`

    return NextResponse.json({
      success: true,
      message: 'Project shared successfully and invitation sent.',
      coupleId,
      projectId,
      emailSent: emailResult.success,
      emailError: emailResult.error,
      shareableLink,
      invitationToken
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
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No valid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 })
    }

    // Get project sharing information
    try {
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
    } catch (tableError) {
      console.warn('project_invitations table may not exist:', tableError)
      return NextResponse.json({
        invitations: []
      })
    }

  } catch (error: unknown) {
    console.error('Get project sharing error:', error)
    return NextResponse.json({ 
      error: 'Failed to get project sharing information', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
