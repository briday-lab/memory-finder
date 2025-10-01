import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { query } from '@/lib/database'

// S3 Client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
})

const RAW_BUCKET = process.env.S3_RAW_BUCKET || 'memory-finder-raw-120915929747-us-east-2'
const PROCESSED_BUCKET = process.env.S3_PROCESSED_BUCKET || 'memory-finder-processed-120915929747-us-east-2'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileId, projectId, userId, userType } = body

    console.log('🔗 Video URL request:', {
      fileId,
      projectId,
      userId,
      userType
    })

    if (!fileId || !projectId || !userId || !userType) {
      return NextResponse.json({ 
        error: 'File ID, project ID, user ID, and user type are required' 
      }, { status: 400 })
    }

    // Verify user has access to this project
    let accessQuery = ''
    let accessParams: string[] = []

    if (userType === 'videographer') {
      // Videographer can access their own projects
      accessQuery = `
        SELECT p.id FROM projects p 
        WHERE p.id = $1 AND p.videographer_id = $2
      `
      accessParams = [projectId, userId]
    } else if (userType === 'couple') {
      // Couple can access projects they've been invited to
      accessQuery = `
        SELECT p.id FROM projects p
        INNER JOIN project_invitations pi ON pi.project_id = p.id
        WHERE p.id = $1 AND pi.couple_id = $2 AND pi.status IN ('sent', 'accepted')
      `
      accessParams = [projectId, userId]
    } else {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 400 })
    }

    const accessResult = await query(accessQuery, accessParams)
    
    if (accessResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Access denied - you do not have permission to view this project' 
      }, { status: 403 })
    }

    // Get file information
    const fileQuery = `
      SELECT f.*, 
             CASE 
               WHEN f.status = 'completed' THEN 'processed'
               ELSE 'raw'
             END as bucket_type
      FROM files f
      WHERE f.id = $1 AND f.project_id = $2
    `

    const fileResult = await query(fileQuery, [fileId, projectId])
    
    if (fileResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'File not found' 
      }, { status: 404 })
    }

    const file = fileResult.rows[0]
    const bucket = file.bucket_type === 'processed' ? PROCESSED_BUCKET : RAW_BUCKET

    // Generate presigned URL for viewing
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: file.s3_key,
    })

    const videoUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 3600 // 1 hour
    })

    console.log('✅ Video URL generated:', {
      fileId,
      bucket,
      expiresIn: 3600
    })

    return NextResponse.json({
      videoUrl,
      file: {
        id: file.id,
        fileName: file.file_name,
        fileSize: file.file_size,
        fileType: file.file_type,
        status: file.status,
        createdAt: file.created_at
      },
      expiresIn: 3600
    })

  } catch (error) {
    console.error('Video URL error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate video URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const bucket = searchParams.get('bucket') || RAW_BUCKET

    if (!key) {
      return NextResponse.json({ error: 'S3 key is required' }, { status: 400 })
    }

    // Generate presigned URL for direct access
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const videoUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 3600 // 1 hour
    })

    return NextResponse.json({
      videoUrl,
      expiresIn: 3600
    })

  } catch (error) {
    console.error('Direct video URL error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate video URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}