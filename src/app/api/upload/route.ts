import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileName, fileType, projectId } = body

    if (!fileName || !projectId) {
      return NextResponse.json({ error: 'fileName and projectId are required' }, { status: 400 })
    }

    // Get presigned URL from AWS API
    const presignResponse = await fetch('https://4whhkqo1oi.execute-api.us-east-2.amazonaws.com/prod/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: `uploads/${projectId}/${Date.now()}-${fileName}`,
        contentType: fileType || 'application/octet-stream'
      })
    })

    if (!presignResponse.ok) {
      return NextResponse.json({ error: 'Failed to get presigned URL' }, { status: 500 })
    }

    const { url, key, bucket } = await presignResponse.json()

    // For now, we'll return the presigned URL without database storage
    // In production, you'd save this to your database
    return NextResponse.json({ 
      success: true, 
      presignedUrl: url,
      key,
      bucket,
      file: {
        id: `file-${Date.now()}`,
        filename: fileName,
        status: 'uploaded',
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
