import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command, _Object } from '@aws-sdk/client-s3'

const REGION = process.env.AWS_REGION || 'us-east-2'
const RAW_BUCKET = process.env.RAW_BUCKET || 'memory-finder-raw-120915929747-us-east-2'
const s3 = new S3Client({ region: REGION })

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const listCmd = new ListObjectsV2Command({
      Bucket: RAW_BUCKET,
      Prefix: `uploads/${projectId}/`
    })

    const result = await s3.send(listCmd)
    const files: _Object[] = result.Contents || []

    const items = files
      .filter((f) => (f.Key || '').endsWith('.mp4') || (f.Key || '').endsWith('.mov') || (f.Key || '').endsWith('.mkv') || (f.Key || '').endsWith('.MP4'))
      .map((f) => ({
        key: f.Key,
        fileName: f.Key ? f.Key.split('/').pop() : undefined,
        size: f.Size,
        lastModified: f.LastModified,
      }))

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('List files error:', error)
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }
}


