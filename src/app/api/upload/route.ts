import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileName, fileType, projectId, fileSize } = body

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

    // Save file information to database
    const fileResult = await query(
      `INSERT INTO files (project_id, filename, s3_key, s3_bucket, file_size, file_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'uploaded')
       RETURNING *`,
      [projectId, fileName, key, bucket, fileSize || null, fileType || null]
    )

    return NextResponse.json({ 
      success: true, 
      presignedUrl: url,
      key,
      bucket,
      file: fileResult.rows[0]
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
