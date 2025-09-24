import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { searchQueryId, videoSegmentId } = body

    if (!searchQueryId || !videoSegmentId) {
      return NextResponse.json({ 
        error: 'Search query ID and video segment ID are required' 
      }, { status: 400 })
    }

    // Update the search result to mark it as clicked
    await query(
      `UPDATE search_results 
       SET clicked = true, clicked_at = NOW() 
       WHERE search_query_id = $1 AND video_segment_id = $2`,
      [searchQueryId, videoSegmentId]
    )

    return NextResponse.json({ 
      success: true,
      message: 'Click tracked successfully' 
    })

  } catch (error: unknown) {
    console.error('Search click tracking error:', error)
    return NextResponse.json({ 
      error: 'Failed to track click', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
