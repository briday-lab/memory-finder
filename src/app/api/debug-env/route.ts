import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const envVars: { [key: string]: string | undefined } = {}
  for (const key in process.env) {
    if (key.startsWith('AWS_') || key.startsWith('MEMORY_FINDER_')) {
      envVars[key] = process.env[key]
    }
  }

  return NextResponse.json({
    message: 'Environment variables for debugging',
    envVars,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('AWS') || key.includes('MEMORY'))
  })
}
