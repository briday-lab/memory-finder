import { NextRequest, NextResponse } from 'next/server'
import { query } from '../../../lib/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { generateEmbedding } from '../../../lib/embeddings'
import cache, { CacheKeys, CacheTTL } from '../../../lib/cache'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query: searchQuery, projectId, limit = 20, similarityThreshold = 0.7 } = body

    if (!searchQuery || !projectId) {
      return NextResponse.json({ 
        error: 'Search query and project ID are required' 
      }, { status: 400 })
    }

    // Check cache first
    const cacheKey = CacheKeys.searchResults(searchQuery, projectId)
    const cachedResults = cache.get(cacheKey)
    if (cachedResults) {
      return NextResponse.json({ results: cachedResults })
    }

    // Generate embedding for the search query
    const embeddingResult = await generateEmbedding(searchQuery)
    const queryEmbedding = embeddingResult.embedding
    
    // Log the search query for analytics
    const searchQueryResult = await query(
      `INSERT INTO search_queries (project_id, user_id, query_text, query_embedding_data, execution_time_ms)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        projectId,
        (session.user as { id?: string }).id,
        searchQuery,
        JSON.stringify(queryEmbedding),
        0 // Will be updated after execution
      ]
    )

    const searchQueryId = searchQueryResult.rows[0].id
    const startTime = Date.now()

    // Perform semantic search using the database function
    const searchResults = await query(
      `SELECT * FROM search_video_segments($1, $2, $3, $4)`,
      [
        JSON.stringify(queryEmbedding),
        projectId,
        similarityThreshold,
        limit
      ]
    )

    const executionTime = Date.now() - startTime

    // Update search query with execution time
    await query(
      `UPDATE search_queries SET execution_time_ms = $1, results_count = $2 WHERE id = $3`,
      [executionTime, searchResults.rows.length, searchQueryId]
    )

    // Log search results for analytics
    for (let i = 0; i < searchResults.rows.length; i++) {
      const result = searchResults.rows[i]
      await query(
        `INSERT INTO search_results (search_query_id, video_segment_id, rank_position, relevance_score)
         VALUES ($1, $2, $3, $4)`,
        [searchQueryId, result.segment_id, i + 1, result.similarity_score]
      )
    }

    // Format results for frontend
    const formattedResults = searchResults.rows.map(result => ({
      id: result.segment_id,
      fileId: result.file_id,
      startTime: result.start_time_seconds,
      endTime: result.end_time_seconds,
      duration: result.duration_seconds,
      content: result.content_text,
      contentType: result.content_type,
      confidence: result.confidence_score,
      similarity: result.similarity_score,
      thumbnailUrl: result.thumbnail_s3_key,
      videoUrl: result.proxy_s3_key
    }))

    // Cache the formatted results
    cache.set(cacheKey, formattedResults, CacheTTL.MEDIUM)

    return NextResponse.json({
      results: formattedResults,
      totalResults: searchResults.rows.length,
      executionTimeMs: executionTime,
      searchQueryId
    })

  } catch (error: unknown) {
    console.error('Semantic search error:', error)
    return NextResponse.json({ 
      error: 'Search failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!projectId) {
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 })
    }

    // Get recent search queries for this project
    const recentQueries = await query(
      `SELECT query_text, results_count, created_at
       FROM search_queries 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [projectId, limit]
    )

    return NextResponse.json({
      recentQueries: recentQueries.rows
    })

  } catch (error: unknown) {
    console.error('Get search history error:', error)
    return NextResponse.json({ 
      error: 'Failed to get search history', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
