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

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ 
        error: 'File ID is required' 
      }, { status: 400 })
    }

    // Get processing job status using the database function
    const statusResult = await query(
      `SELECT * FROM get_processing_status($1)`,
      [fileId]
    )

    if (statusResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'No processing job found for this file' 
      }, { status: 404 })
    }

    const status = statusResult.rows[0]

    return NextResponse.json({
      jobId: status.job_id,
      status: status.status,
      currentStep: status.current_step,
      progressPercentage: status.progress_percentage,
      errorMessage: status.error_message,
      startedAt: status.started_at,
      completedAt: status.completed_at
    })

  } catch (error: unknown) {
    console.error('Processing status error:', error)
    return NextResponse.json({ 
      error: 'Failed to get processing status', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      fileId, 
      projectId, 
      stepFunctionsExecutionArn, 
      status, 
      currentStep, 
      progressPercentage, 
      errorMessage 
    } = body

    if (!fileId || !projectId || !stepFunctionsExecutionArn) {
      return NextResponse.json({ 
        error: 'File ID, project ID, and Step Functions execution ARN are required' 
      }, { status: 400 })
    }

    // Upsert processing job status
    const result = await query(
      `INSERT INTO processing_jobs (
        file_id, project_id, step_functions_execution_arn, 
        status, current_step, progress_percentage, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (step_functions_execution_arn) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        current_step = EXCLUDED.current_step,
        progress_percentage = EXCLUDED.progress_percentage,
        error_message = EXCLUDED.error_message,
        updated_at = NOW(),
        completed_at = CASE 
          WHEN EXCLUDED.status IN ('completed', 'failed', 'cancelled') 
          THEN NOW() 
          ELSE processing_jobs.completed_at 
        END
      RETURNING id`,
      [
        fileId,
        projectId,
        stepFunctionsExecutionArn,
        status || 'running',
        currentStep,
        progressPercentage || 0,
        errorMessage
      ]
    )

    return NextResponse.json({
      jobId: result.rows[0].id,
      success: true
    })

  } catch (error: unknown) {
    console.error('Processing status update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update processing status', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
