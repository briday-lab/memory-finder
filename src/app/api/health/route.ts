import { NextRequest, NextResponse } from 'next/server'
import { query } from '../../../lib/database'

export async function GET(request: NextRequest) {
  try {
    // Check database connectivity
    const dbCheck = await query('SELECT 1 as health_check', [])
    
    // Check environment
    const environment = process.env.NODE_ENV || 'development'
    
    // Basic health metrics
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbCheck.rows.length > 0 ? 'healthy' : 'unhealthy',
        api: 'healthy'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
    
    return NextResponse.json(healthData, { status: 200 })
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        database: 'unhealthy',
        api: 'healthy'
      }
    }, { status: 503 })
  }
}
