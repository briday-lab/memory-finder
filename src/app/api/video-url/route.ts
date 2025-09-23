import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({ 
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

export async function POST(request: NextRequest) {
  try {
    const { key, bucket } = await request.json()

    if (!key || !bucket) {
      return NextResponse.json({ error: 'Missing key or bucket' }, { status: 400 })
    }

    // Generate presigned URL for GET operation
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })

    const videoUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })

    return NextResponse.json({ 
      success: true, 
      videoUrl
    })

  } catch (error) {
    console.error('Video URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
