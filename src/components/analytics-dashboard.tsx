'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import { 
  Users, FileVideo, Search, Clock, 
  Calendar, Activity
} from 'lucide-react'

interface AnalyticsData {
  userType: 'videographer' | 'couple'
  projectStats: {
    total_projects: number
    active_projects: number
    shared_projects?: number
  }
  fileStats?: {
    total_files: number
    processed_files: number
    total_size_bytes: number
  }
  searchStats: {
    total_searches: number
    unique_searchers?: number
    avg_search_time_ms: number
    projects_searched?: number
  }
  clickStats?: {
    total_clicks: number
    unique_moments_clicked: number
    avg_result_rank_clicked: number
  }
  popularQueries: Array<{
    query_text: string
    search_count: number
    avg_time_ms: number
  }>
  recentActivity?: Array<{
    activity_type: string
    description: string
    timestamp: string
  }>
  recentSearches?: Array<{
    query_text: string
    created_at: string
    results_found: number
  }>
}


export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics')
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        setError('Failed to load analytics')
      }
    } catch {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error || 'Failed to load analytics'}</p>
      </div>
    )
  }

  const isVideographer = analytics.userType === 'videographer'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <div className="text-sm text-gray-500">
          Last 30 days
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.projectStats.total_projects}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.projectStats.active_projects} active
              {isVideographer && analytics.projectStats.shared_projects && (
                <span>, {analytics.projectStats.shared_projects} shared</span>
              )}
            </p>
          </CardContent>
        </Card>

        {isVideographer && analytics.fileStats && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Files</CardTitle>
              <FileVideo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.fileStats.total_files}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.fileStats.processed_files} processed
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Searches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.searchStats.total_searches}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.searchStats.unique_searchers || analytics.searchStats.projects_searched} unique
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Search Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analytics.searchStats.avg_search_time_ms)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Search Queries */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Search Queries</CardTitle>
            <CardDescription>Most searched terms in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.popularQueries.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="query_text" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="search_count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Search Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Search Performance</CardTitle>
            <CardDescription>Average search time by query</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.popularQueries.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="query_text" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="avg_time_ms" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Click Analytics (for couples) */}
      {!isVideographer && analytics.clickStats && (
        <Card>
          <CardHeader>
            <CardTitle>Click Analytics</CardTitle>
            <CardDescription>Your interaction with search results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.clickStats.total_clicks}
                </div>
                <p className="text-sm text-gray-600">Total Clicks</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.clickStats.unique_moments_clicked}
                </div>
                <p className="text-sm text-gray-600">Unique Moments</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.clickStats.avg_result_rank_clicked.toFixed(1)}
                </div>
                <p className="text-sm text-gray-600">Avg Position Clicked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isVideographer && analytics.recentActivity && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.recentActivity.slice(0, 8).map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {activity.activity_type === 'project_created' && <Calendar className="h-4 w-4 text-blue-500" />}
                      {activity.activity_type === 'file_uploaded' && <FileVideo className="h-4 w-4 text-green-500" />}
                      {activity.activity_type === 'project_shared' && <Users className="h-4 w-4 text-purple-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!isVideographer && analytics.recentSearches && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Searches</CardTitle>
              <CardDescription>Your latest search queries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.recentSearches.slice(0, 8).map((search, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Search className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          &ldquo;{search.query_text}&rdquo;
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(search.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {search.results_found} results
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
