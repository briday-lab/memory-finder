import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { query, projectId } = await request.json()

    if (!query || !projectId) {
      return NextResponse.json(
        { error: 'Missing query or project ID' },
        { status: 400 }
      )
    }

    // Search using AWS API
    const searchResponse = await fetch('https://4whhkqo1oi.execute-api.us-east-2.amazonaws.com/prod/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, projectId })
    })

    if (!searchResponse.ok) {
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    const searchData = await searchResponse.json()

    return NextResponse.json({
      success: true,
      results: searchData.results || [],
      query: searchData.query,
      totalResults: searchData.results?.length || 0,
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
