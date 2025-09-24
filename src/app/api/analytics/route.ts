import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as { id?: string }).id
    const userType = (session.user as { userType?: string }).userType

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 })
    }

    // Get analytics based on user type
    if (userType === 'videographer') {
      return await getVideographerAnalytics(userId)
    } else if (userType === 'couple') {
      return await getCoupleAnalytics(userId)
    } else {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 400 })
    }

  } catch (error: unknown) {
    console.error('Analytics error:', error)
    return NextResponse.json({
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getVideographerAnalytics(userId: string) {
  // Project statistics
  const projectStats = await query(
    `SELECT 
      COUNT(*) as total_projects,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_projects,
      COUNT(CASE WHEN couple_id IS NOT NULL THEN 1 END) as shared_projects
    FROM projects 
    WHERE videographer_id = $1`,
    [userId]
  )

  // File statistics
  const fileStats = await query(
    `SELECT 
      COUNT(*) as total_files,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as processed_files,
      SUM(file_size) as total_size_bytes
    FROM files f
    JOIN projects p ON f.project_id = p.id
    WHERE p.videographer_id = $1`,
    [userId]
  )

  // Search statistics
  const searchStats = await query(
    `SELECT 
      COUNT(*) as total_searches,
      COUNT(DISTINCT sq.user_id) as unique_searchers,
      AVG(sq.execution_time_ms) as avg_search_time_ms
    FROM search_queries sq
    JOIN projects p ON sq.project_id = p.id
    WHERE p.videographer_id = $1
    AND sq.created_at >= NOW() - INTERVAL '30 days'`,
    [userId]
  )

  // Popular search queries
  const popularQueries = await query(
    `SELECT 
      sq.query_text,
      COUNT(*) as search_count,
      AVG(sq.execution_time_ms) as avg_time_ms
    FROM search_queries sq
    JOIN projects p ON sq.project_id = p.id
    WHERE p.videographer_id = $1
    AND sq.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY sq.query_text
    ORDER BY search_count DESC
    LIMIT 10`,
    [userId]
  )

  // Recent activity
  const recentActivity = await query(
    `SELECT 
      'project_created' as activity_type,
      p.project_name as description,
      p.created_at as timestamp
    FROM projects p
    WHERE p.videographer_id = $1
    
    UNION ALL
    
    SELECT 
      'file_uploaded' as activity_type,
      f.filename as description,
      f.created_at as timestamp
    FROM files f
    JOIN projects p ON f.project_id = p.id
    WHERE p.videographer_id = $1
    
    UNION ALL
    
    SELECT 
      'project_shared' as activity_type,
      CONCAT('Shared ', p.project_name, ' with ', pi.couple_email) as description,
      pi.created_at as timestamp
    FROM project_invitations pi
    JOIN projects p ON pi.project_id = p.id
    WHERE pi.videographer_id = $1
    
    ORDER BY timestamp DESC
    LIMIT 20`,
    [userId]
  )

  return NextResponse.json({
    userType: 'videographer',
    projectStats: projectStats.rows[0],
    fileStats: fileStats.rows[0],
    searchStats: searchStats.rows[0],
    popularQueries: popularQueries.rows,
    recentActivity: recentActivity.rows
  })
}

async function getCoupleAnalytics(userId: string) {
  // Project statistics
  const projectStats = await query(
    `SELECT 
      COUNT(*) as total_projects,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_projects
    FROM projects 
    WHERE couple_id = $1`,
    [userId]
  )

  // Search statistics
  const searchStats = await query(
    `SELECT 
      COUNT(*) as total_searches,
      AVG(execution_time_ms) as avg_search_time_ms,
      COUNT(DISTINCT project_id) as projects_searched
    FROM search_queries 
    WHERE user_id = $1
    AND created_at >= NOW() - INTERVAL '30 days'`,
    [userId]
  )

  // Popular search queries
  const popularQueries = await query(
    `SELECT 
      query_text,
      COUNT(*) as search_count,
      AVG(execution_time_ms) as avg_time_ms
    FROM search_queries 
    WHERE user_id = $1
    AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY query_text
    ORDER BY search_count DESC
    LIMIT 10`,
    [userId]
  )

  // Click-through statistics
  const clickStats = await query(
    `SELECT 
      COUNT(*) as total_clicks,
      COUNT(DISTINCT video_moment_id) as unique_moments_clicked,
      AVG(rank) as avg_result_rank_clicked
    FROM search_result_clicks src
    JOIN search_queries sq ON src.search_query_id = sq.id
    WHERE sq.user_id = $1
    AND src.clicked_at >= NOW() - INTERVAL '30 days'`,
    [userId]
  )

  // Recent searches
  const recentSearches = await query(
    `SELECT 
      sq.query_text,
      sq.created_at,
      COUNT(sr.id) as results_found
    FROM search_queries sq
    LEFT JOIN search_results sr ON sq.id = sr.search_query_id
    WHERE sq.user_id = $1
    ORDER BY sq.created_at DESC
    LIMIT 10`,
    [userId]
  )

  return NextResponse.json({
    userType: 'couple',
    projectStats: projectStats.rows[0],
    searchStats: searchStats.rows[0],
    clickStats: clickStats.rows[0],
    popularQueries: popularQueries.rows,
    recentSearches: recentSearches.rows
  })
}
