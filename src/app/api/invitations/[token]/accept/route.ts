import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await params
    const body = await request.json()
    const { userId } = body

    if (!token || !userId) {
      return NextResponse.json({ 
        error: 'Invitation token and user ID are required' 
      }, { status: 400 })
    }

    // Verify the invitation exists and is valid
    const invitationResult = await query(
      `SELECT pi.*, p.project_name, u.email as videographer_email
      FROM project_invitations pi
      JOIN projects p ON pi.project_id = p.id
      JOIN users u ON pi.videographer_id = u.id
      WHERE pi.invitation_token = $1 AND pi.status = 'sent'`,
      [token]
    )

    if (invitationResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Invitation not found or has already been accepted' 
      }, { status: 404 })
    }

    const invitation = invitationResult.rows[0]

    // Check if invitation has expired (30 days)
    const createdAt = new Date(invitation.created_at)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    if (createdAt < thirtyDaysAgo) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
    }

    // Update the invitation status to accepted
    await query(
      `UPDATE project_invitations 
       SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
       WHERE invitation_token = $1`,
      [token]
    )

    // Ensure the user is linked to the project as a couple
    await query(
      `UPDATE projects 
       SET couple_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [userId, invitation.project_id]
    )

    // Update user type to couple if needed
    await query(
      `UPDATE users 
       SET user_type = 'couple', updated_at = NOW()
       WHERE id = $1`,
      [userId]
    )

    console.log(`Invitation accepted: ${invitation.project_name} by user ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      projectId: invitation.project_id,
      projectName: invitation.project_name
    })

  } catch (error: unknown) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json({
      error: 'Failed to accept invitation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
