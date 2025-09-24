import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({ user: result.rows[0] })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, userType } = body

    if (!email || !userType) {
      return NextResponse.json({ error: 'Email and user type are required' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ user: existingUser.rows[0] })
    }

    // Create new user
    const result = await query(
      'INSERT INTO users (email, name, user_type) VALUES ($1, $2, $3) RETURNING *',
      [email, name || email.split('@')[0], userType]
    )

    return NextResponse.json({ user: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
