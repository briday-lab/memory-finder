import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { key, bucket } = await request.json()

    if (!key || !bucket) {
      return NextResponse.json({ error: 'Missing key or bucket' }, { status: 400 })
    }

    // Get presigned URL from AWS API for video streaming
    const presignResponse = await fetch('https://4whhkqo1oi.execute-api.us-east-2.amazonaws.com/prod/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        bucket,
        contentType: 'video/mp4',
        expiresIn: 3600 // 1 hour
      })
    })

    if (!presignResponse.ok) {
      return NextResponse.json({ error: 'Failed to get presigned URL' }, { status: 500 })
    }

    const { url } = await presignResponse.json()

    return NextResponse.json({ 
      success: true, 
      videoUrl: url
    })

  } catch (error) {
    console.error('Video URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
