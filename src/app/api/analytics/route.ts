import { NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
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
  try {
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
        COALESCE(SUM(file_size), 0) as total_size_bytes
      FROM files f
      JOIN projects p ON f.project_id = p.id
      WHERE p.videographer_id = $1`,
      [userId]
    )

    // Search statistics (with fallback if table doesn't exist)
    let searchStats = { rows: [{ total_searches: 0, unique_searchers: 0, avg_search_time_ms: 0 }] }
    try {
      searchStats = await query(
        `SELECT 
          COUNT(*) as total_searches,
          COUNT(DISTINCT sq.user_id) as unique_searchers,
          COALESCE(AVG(sq.execution_time_ms), 0) as avg_search_time_ms
        FROM search_queries sq
        JOIN projects p ON sq.project_id = p.id
        WHERE p.videographer_id = $1
        AND sq.created_at >= NOW() - INTERVAL '30 days'`,
        [userId]
      )
    } catch (searchError) {
      console.warn('Search queries table may not exist:', searchError)
    }

    // Popular search queries (with fallback)
    let popularQueries: any = { rows: [] }
    try {
      popularQueries = await query(
        `SELECT 
          sq.query_text,
          COUNT(*) as search_count,
          COALESCE(AVG(sq.execution_time_ms), 0) as avg_time_ms
        FROM search_queries sq
        JOIN projects p ON sq.project_id = p.id
        WHERE p.videographer_id = $1
        AND sq.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY sq.query_text
        ORDER BY search_count DESC
        LIMIT 10`,
        [userId]
      )
    } catch (queryError) {
      console.warn('Popular queries may not be available:', queryError)
    }

    // Recent activity (simplified to avoid complex joins)
    let recentActivity: any = { rows: [] }
    try {
      recentActivity = await query(
        `SELECT 
          'project_created' as activity_type,
          project_name as description,
          created_at as timestamp
        FROM projects
        WHERE videographer_id = $1
        ORDER BY created_at DESC
        LIMIT 10`,
        [userId]
      )
    } catch (activityError) {
      console.warn('Recent activity may not be available:', activityError)
    }

    return NextResponse.json({
      userType: 'videographer',
      projectStats: projectStats.rows[0] || { total_projects: 0, active_projects: 0, shared_projects: 0 },
      fileStats: fileStats.rows[0] || { total_files: 0, processed_files: 0, total_size_bytes: 0 },
      searchStats: searchStats.rows[0] || { total_searches: 0, unique_searchers: 0, avg_search_time_ms: 0 },
      popularQueries: popularQueries.rows || [],
      recentActivity: recentActivity.rows || []
    })
  } catch (error) {
    console.error('Error in getVideographerAnalytics:', error)
    // Return basic analytics even if some queries fail
    return NextResponse.json({
      userType: 'videographer',
      projectStats: { total_projects: 0, active_projects: 0, shared_projects: 0 },
      fileStats: { total_files: 0, processed_files: 0, total_size_bytes: 0 },
      searchStats: { total_searches: 0, unique_searchers: 0, avg_search_time_ms: 0 },
      popularQueries: [],
      recentActivity: []
    })
  }
}

async function getCoupleAnalytics(userId: string) {
  try {
    // Project statistics
    const projectStats = await query(
      `SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_projects
      FROM projects 
      WHERE couple_id = $1`,
      [userId]
    )

    // Search statistics (with fallback)
    let searchStats = { rows: [{ total_searches: 0, avg_search_time_ms: 0, projects_searched: 0 }] }
    try {
      searchStats = await query(
        `SELECT 
          COUNT(*) as total_searches,
          COALESCE(AVG(execution_time_ms), 0) as avg_search_time_ms,
          COUNT(DISTINCT project_id) as projects_searched
        FROM search_queries 
        WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'`,
        [userId]
      )
    } catch (searchError) {
      console.warn('Search queries table may not exist:', searchError)
    }

    // Popular search queries (with fallback)
    let popularQueries: any = { rows: [] }
    try {
      popularQueries = await query(
        `SELECT 
          query_text,
          COUNT(*) as search_count,
          COALESCE(AVG(execution_time_ms), 0) as avg_time_ms
        FROM search_queries 
        WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY query_text
        ORDER BY search_count DESC
        LIMIT 10`,
        [userId]
      )
    } catch (queryError) {
      console.warn('Popular queries may not be available:', queryError)
    }

    // Click-through statistics (with fallback)
    let clickStats = { rows: [{ total_clicks: 0, unique_moments_clicked: 0, avg_result_rank_clicked: 0 }] }
    try {
      clickStats = await query(
        `SELECT 
          COUNT(*) as total_clicks,
          COUNT(DISTINCT video_moment_id) as unique_moments_clicked,
          COALESCE(AVG(rank), 0) as avg_result_rank_clicked
        FROM search_result_clicks src
        JOIN search_queries sq ON src.search_query_id = sq.id
        WHERE sq.user_id = $1
        AND src.clicked_at >= NOW() - INTERVAL '30 days'`,
        [userId]
      )
    } catch (clickError) {
      console.warn('Click statistics may not be available:', clickError)
    }

    // Recent searches (with fallback)
    let recentSearches: any = { rows: [] }
    try {
      recentSearches = await query(
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
    } catch (recentError) {
      console.warn('Recent searches may not be available:', recentError)
    }

    return NextResponse.json({
      userType: 'couple',
      projectStats: projectStats.rows[0] || { total_projects: 0, active_projects: 0 },
      searchStats: searchStats.rows[0] || { total_searches: 0, avg_search_time_ms: 0, projects_searched: 0 },
      clickStats: clickStats.rows[0] || { total_clicks: 0, unique_moments_clicked: 0, avg_result_rank_clicked: 0 },
      popularQueries: popularQueries.rows || [],
      recentSearches: recentSearches.rows || []
    })
  } catch (error) {
    console.error('Error in getCoupleAnalytics:', error)
    // Return basic analytics even if some queries fail
    return NextResponse.json({
      userType: 'couple',
      projectStats: { total_projects: 0, active_projects: 0 },
      searchStats: { total_searches: 0, avg_search_time_ms: 0, projects_searched: 0 },
      clickStats: { total_clicks: 0, unique_moments_clicked: 0, avg_result_rank_clicked: 0 },
      popularQueries: [],
      recentSearches: []
    })
  }
}
