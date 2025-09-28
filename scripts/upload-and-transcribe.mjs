/* eslint-disable */
import fs from 'fs'
import path from 'path'
import AWS from 'aws-sdk'

const ENV_PATH = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(ENV_PATH)) {
  console.error('.env.local not found')
  process.exit(1)
}

const env = Object.fromEntries(
  fs
    .readFileSync(ENV_PATH, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx), l.slice(idx + 1)]
    })
)

const B2_ENDPOINT = env.B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com'
const B2_KEY_ID = env.B2_APPLICATION_KEY_ID
const B2_KEY = env.B2_APPLICATION_KEY
const B2_BUCKET = env.B2_BUCKET_NAME || 'memory-finder-videos'
const RUNPOD_KEY = env.RUNPOD_API_KEY
const RUNPOD_ENDPOINT_ID = env.RUNPOD_ENDPOINT_ID

if (!B2_KEY_ID || !B2_KEY || !RUNPOD_KEY || !RUNPOD_ENDPOINT_ID) {
  console.error('Missing required env vars. Ensure B2 and RunPod vars are set.')
  process.exit(1)
}

const s3 = new AWS.S3({
  endpoint: B2_ENDPOINT,
  accessKeyId: B2_KEY_ID,
  secretAccessKey: B2_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
})

async function uploadFile(localPath, key) {
  const body = fs.createReadStream(localPath)
  const contentType = 'video/mp4'
  const res = await s3
    .upload({ Bucket: B2_BUCKET, Key: key, Body: body, ContentType: contentType })
    .promise()
  return res
}

function getSignedUrl(key, expiresInSec = 3600) {
  return s3.getSignedUrl('getObject', { Bucket: B2_BUCKET, Key: key, Expires: expiresInSec })
}

async function runRunpod(audioUrl) {
  const endpointId = RUNPOD_ENDPOINT_ID
  const url = `https://api.runpod.ai/v2/${endpointId}/run`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RUNPOD_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: { audio_url: audioUrl, task: 'transcribe' } }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('RunPod run error:', data)
    process.exit(1)
  }
  return data
}

async function pollStatus(runId, timeoutMs = 10 * 60 * 1000, intervalMs = 5000) {
  const endpointId = RUNPOD_ENDPOINT_ID
  const url = `https://api.runpod.ai/v2/${endpointId}/runs/${runId}/status`
  const start = Date.now()
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${RUNPOD_KEY}` } })
    const data = await res.json()
    if (!res.ok) {
      console.error('Status error:', data)
      process.exit(1)
    }
    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      return data
    }
    if (Date.now() - start > timeoutMs) {
      console.error('Timed out waiting for transcription')
      process.exit(1)
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}

async function main() {
  const localFile = process.argv[2] || path.join(process.env.HOME || '', 'Desktop', 'C2363.MP4')
  if (!fs.existsSync(localFile)) {
    console.error('Local file not found:', localFile)
    process.exit(1)
  }
  const key = `test/${path.basename(localFile)}`
  console.log('Uploading to B2 as', key)
  const up = await uploadFile(localFile, key)
  console.log('Uploaded:', up.Location)

  const signedUrl = getSignedUrl(key, 7200)
  console.log('Signed URL (2h):', signedUrl)

  console.log('Starting RunPod transcription...')
  const run = await runRunpod(signedUrl)
  console.log('Run started:', run)
  const runId = run.id || run.runId || run['id']
  if (!runId) {
    console.error('Could not find run id in response')
    process.exit(1)
  }
  const final = await pollStatus(runId)
  console.log('Final status:', final.status)
  console.log('Output:', JSON.stringify(final.output || final, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

