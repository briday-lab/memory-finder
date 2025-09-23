/* eslint-disable */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

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

const KEY_ID = env.B2_APPLICATION_KEY_ID
const APP_KEY = env.B2_APPLICATION_KEY
const BUCKET_NAME = env.B2_BUCKET_NAME || 'memory-finder-videos'
const RUNPOD_KEY = env.RUNPOD_API_KEY
const RUNPOD_ENDPOINT_ID = env.RUNPOD_ENDPOINT_ID

if (!KEY_ID || !APP_KEY || !RUNPOD_KEY || !RUNPOD_ENDPOINT_ID) {
  console.error('Missing env vars. Need B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, RUNPOD_API_KEY, RUNPOD_ENDPOINT_ID')
  process.exit(1)
}

async function b2Authorize() {
  const auth = Buffer.from(`${KEY_ID}:${APP_KEY}`).toString('base64')
  const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { Authorization: `Basic ${auth}` },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error('B2 authorize failed: ' + JSON.stringify(data))
  }
  return data
}

async function b2ListBuckets(apiUrl, authToken, accountId) {
  const res = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
    method: 'POST',
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('b2_list_buckets failed: ' + JSON.stringify(data))
  return data.buckets
}

async function b2UpdateBucketToPublic(apiUrl, authToken, accountId, bucketId) {
  const res = await fetch(`${apiUrl}/b2api/v2/b2_update_bucket`, {
    method: 'POST',
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId, bucketId, bucketType: 'allPublic' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('b2_update_bucket failed: ' + JSON.stringify(data))
  return data
}

async function b2GetUploadUrl(apiUrl, authToken, bucketId) {
  const res = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('b2_get_upload_url failed: ' + JSON.stringify(data))
  return data
}

function sha1(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex')
}

async function b2UploadFile(uploadUrl, uploadAuthToken, filePath, key) {
  const fileBuffer = fs.readFileSync(filePath)
  const fileName = key
  const mimeType = 'video/mp4'
  const contentSha1 = sha1(fileBuffer)

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: uploadAuthToken,
      'X-Bz-File-Name': encodeURIComponent(fileName),
      'Content-Type': mimeType,
      'X-Bz-Content-Sha1': contentSha1,
    },
    body: fileBuffer,
  })
  const data = await res.json()
  if (!res.ok) throw new Error('b2_upload_file failed: ' + JSON.stringify(data))
  return data
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
  if (!res.ok) throw new Error('RunPod run error: ' + JSON.stringify(data))
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
    if (!res.ok) throw new Error('Status error: ' + JSON.stringify(data))
    if (data.status === 'COMPLETED' || data.status === 'FAILED') return data
    if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for transcription')
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}

async function main() {
  const localFile = path.join(process.env.HOME || '', 'Desktop', 'C2363.MP4')
  if (!fs.existsSync(localFile)) {
    console.error('Local file not found:', localFile)
    process.exit(1)
  }

  const auth = await b2Authorize()
  const { apiUrl, authorizationToken, accountId, downloadUrl } = auth

  const buckets = await b2ListBuckets(apiUrl, authorizationToken, accountId)
  const bucket = buckets.find((b) => b.bucketName === BUCKET_NAME)
  if (!bucket) {
    throw new Error(`Bucket ${BUCKET_NAME} not found`)
  }

  // Ensure bucket is public for direct URL access
  if (bucket.bucketType !== 'allPublic') {
    await b2UpdateBucketToPublic(apiUrl, authorizationToken, accountId, bucket.bucketId)
    console.log('Bucket updated to allPublic')
  }

  const key = `test/${path.basename(localFile)}`
  const { uploadUrl, authorizationToken: uploadAuthToken } = await b2GetUploadUrl(apiUrl, authorizationToken, bucket.bucketId)
  console.log('Uploading to B2 as', key)
  await b2UploadFile(uploadUrl, uploadAuthToken, localFile, key)
  const publicUrl = `${downloadUrl}/file/${encodeURIComponent(BUCKET_NAME)}/${encodeURIComponent(key)}`
  console.log('Public URL:', publicUrl)

  console.log('Starting RunPod transcription...')
  const run = await runRunpod(publicUrl)
  console.log('Run started:', run)
  const runId = run.id || run.runId
  if (!runId) throw new Error('No run id in response')
  const final = await pollStatus(runId)
  console.log('Final status:', final.status)
  console.log('Output:', JSON.stringify(final.output || final, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
