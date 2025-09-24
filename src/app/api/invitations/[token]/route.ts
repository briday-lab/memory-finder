import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 })
    }

    // Fetch invitation details with project and videographer info
    const invitationResult = await query(
      `SELECT 
        pi.*,
        p.project_name, p.bride_name, p.groom_name, p.wedding_date, p.description,
        u.name as videographer_name, u.email as videographer_email
      FROM project_invitations pi
      JOIN projects p ON pi.project_id = p.id
      JOIN users u ON pi.videographer_id = u.id
      WHERE pi.invitation_token = $1 AND pi.status = 'sent'`,
      [token]
    )

    if (invitationResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invitation not found or has expired' }, { status: 404 })
    }

    const invitation = invitationResult.rows[0]

    // Check if invitation has expired (30 days)
    const createdAt = new Date(invitation.created_at)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    if (createdAt < thirtyDaysAgo) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
    }

    return NextResponse.json({
      project: {
        id: invitation.project_id,
        project_name: invitation.project_name,
        bride_name: invitation.bride_name,
        groom_name: invitation.groom_name,
        wedding_date: invitation.wedding_date,
        description: invitation.description
      },
      videographer: {
        name: invitation.videographer_name,
        email: invitation.videographer_email
      },
      invitation: {
        invitation_message: invitation.invitation_message,
        status: invitation.status,
        created_at: invitation.created_at
      }
    })

  } catch (error: unknown) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json({
      error: 'Failed to fetch invitation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
