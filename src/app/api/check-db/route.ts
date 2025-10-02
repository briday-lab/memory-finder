import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // First, let's check what columns exist in the files table
    const tableInfo = await query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'files' ORDER BY ordinal_position",
      []
    )

    // Check for the specific video file - using correct column names
    const result = await query(
      "SELECT * FROM files WHERE s3_key LIKE '%C2468S03.MP4%'",
      []
    )

    // Also get all files to see what's there
    const allFiles = await query(
      "SELECT * FROM files LIMIT 5",
      []
    )

    return NextResponse.json({
      message: 'Database check results',
      tableColumns: tableInfo.rows,
      videoFound: result.rows.length > 0,
      videoData: result.rows,
      totalFiles: result.rows.length,
      allFiles: allFiles.rows
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
