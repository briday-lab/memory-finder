import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Check for the specific video file
    const result = await query(
      "SELECT id, file_name, file_size, s3_key, s3_bucket, project_id, created_at FROM files WHERE s3_key LIKE '%C2468S03.MP4%'",
      []
    )

    return NextResponse.json({
      message: 'Database check results',
      videoFound: result.rows.length > 0,
      videoData: result.rows,
      totalFiles: result.rows.length
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
