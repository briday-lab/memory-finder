import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Check for the specific video file - using correct column names
    const result = await query(
      "SELECT * FROM files WHERE s3_key LIKE '%C2468S03.MP4%'",
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
