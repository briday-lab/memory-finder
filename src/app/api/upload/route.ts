import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { query } from '@/lib/database'
import { v4 as uuidv4 } from 'uuid'

// S3 Client configuration - use default credential provider chain (IAM role)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  // No explicit credentials - will use IAM role from Amplify environment
})

const RAW_BUCKET = process.env.S3_RAW_BUCKET || 'memory-finder-raw-120915929747-us-east-2'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileName, fileSize, fileType, projectId } = body

    console.log('📁 Upload request received:', {
      fileName,
      fileSize,
      fileType,
      projectId
    })

    if (!fileName || !fileSize || !fileType || !projectId) {
      return NextResponse.json({ 
        error: 'File name, size, type, and project ID are required' 
      }, { status: 400 })
    }

    // Validate file type (only video files)
    const allowedTypes = [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv'
    ]

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ 
        error: 'Only video files are allowed' 
      }, { status: 400 })
    }

    // Validate file size (max 5GB)
    const maxSize = 5 * 1024 * 1024 * 1024 // 5GB
    if (fileSize > maxSize) {
      return NextResponse.json({ 
        error: 'File size cannot exceed 5GB' 
      }, { status: 400 })
    }

    // Generate unique file key
    const fileId = uuidv4()
    const fileExtension = fileName.split('.').pop()
    const s3Key = `projects/${projectId}/raw/${fileId}.${fileExtension}`

    // Create presigned URL for upload
    const putObjectCommand = new PutObjectCommand({
      Bucket: RAW_BUCKET,
      Key: s3Key,
      ContentType: fileType,
      Metadata: {
        'project-id': projectId,
        'file-id': fileId,
        'original-name': fileName
      }
    })

    const presignedUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 3600 // 1 hour
    })

    // Store file metadata in database
    const insertQuery = `
      INSERT INTO files (id, project_id, file_name, file_size, file_type, s3_key, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'uploaded', NOW())
      RETURNING *
    `

    const result = await query(insertQuery, [
      fileId,
      projectId,
      fileName,
      fileSize,
      fileType,
      s3Key
    ])

    console.log('✅ File metadata stored:', result.rows[0])

    return NextResponse.json({
      fileId,
      presignedUrl,
      s3Key,
      expiresIn: 3600,
      file: result.rows[0]
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate upload URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get all files for a project
    const filesQuery = `
      SELECT f.*, 
             CASE 
               WHEN f.status = 'uploaded' THEN 'Ready for Processing'
               WHEN f.status = 'processing' THEN 'Processing...'
               WHEN f.status = 'completed' THEN 'Completed'
               WHEN f.status = 'failed' THEN 'Failed'
               ELSE 'Unknown'
             END as status_display
      FROM files f
      WHERE f.project_id = $1
      ORDER BY f.created_at DESC
    `

    const result = await query(filesQuery, [projectId])

    return NextResponse.json({
      files: result.rows
    })

  } catch (error) {
    console.error('Get files error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}