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

function sha1(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex')
}

function guessContentType(file) {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.mp4') return 'video/mp4'
  if (ext === '.wav') return 'audio/wav'
  if (ext === '.mp3') return 'audio/mpeg'
  if (ext === '.m4a') return 'audio/mp4'
  return 'application/octet-stream'
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

async function b2UpdateBucketType(apiUrl, authToken, accountId, bucketId, bucketType) {
  const res = await fetch(`${apiUrl}/b2api/v2/b2_update_bucket`, {
    method: 'POST',
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId, bucketId, bucketType }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('b2_update_bucket failed: ' + JSON.stringify(data))
  return data
}

async function b2StartLargeFile(apiUrl, authToken, bucketId, fileName, contentType) {
  const res = await fetch(`${apiUrl}/b2api/v2/b2_start_large_file`, {
    method: 'POST',
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId, fileName, contentType }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('b2_start_large_file failed: ' + JSON.stringify(data))
  return data.fileId
}

async function b2GetUploadPartUrl(apiUrl, authToken, fileId) {
  const res = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_part_url`, {
    method: 'POST',
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('b2_get_upload_part_url failed: ' + JSON.stringify(data))
  return data
}

async function b2UploadPart(uploadUrl, uploadAuthToken, partNumber, buffer) {
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: uploadAuthToken,
      'X-Bz-Part-Number': String(partNumber),
      'Content-Length': String(buffer.length),
      'X-Bz-Content-Sha1': sha1(buffer),
    },
    body: buffer,
  })
  const data = await res.json()
  if (!res.ok) throw new Error('b2_upload_part failed: ' + JSON.stringify(data))
  return data
}

async function b2FinishLargeFile(apiUrl, authToken, fileId, partSha1Array) {
  const res = await fetch(`${apiUrl}/b2api/v2/b2_finish_large_file`, {
    method: 'POST',
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, partSha1Array }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('b2_finish_large_file failed: ' + JSON.stringify(data))
  return data
}

async function b2GetUploadUrlForBucket(apiUrl, authToken, bucketId) {
  const res = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('b2_get_upload_url failed: ' + JSON.stringify(data))
  return data
}

async function b2UploadSingle(uploadUrl, uploadAuthToken, filePath, key, contentType) {
  const fileBuffer = fs.readFileSync(filePath)
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: uploadAuthToken,
      'X-Bz-File-Name': encodeURIComponent(key),
      'Content-Type': contentType,
      'X-Bz-Content-Sha1': sha1(fileBuffer),
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

async function pollStatus(runId, timeoutMs = 5 * 60 * 1000, intervalMs = 5 * 1000) {
  const endpointId = RUNPOD_ENDPOINT_ID
  const url = `https://api.runpod.ai/v2/${endpointId}/runs/${runId}/status`
  const start = Date.now()
  while (true) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${RUNPOD_KEY}` } })
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = { raw: text } }
    const status = data.status || ''
    console.log('status:', status)
    if (status === 'COMPLETED' || status === 'FAILED') return data
    if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for transcription')
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}

async function main() {
  const localFile = process.argv[2] || path.join(process.env.HOME || '', 'Desktop', 'testtest.wav')
  if (!fs.existsSync(localFile)) {
    console.error('Local file not found:', localFile)
    process.exit(1)
  }

  const auth = await b2Authorize()
  const { apiUrl, authorizationToken, accountId, downloadUrl } = auth

  const buckets = await b2ListBuckets(apiUrl, authorizationToken, accountId)
  const bucket = buckets.find((b) => b.bucketName === BUCKET_NAME)
  if (!bucket) throw new Error(`Bucket ${BUCKET_NAME} not found`)

  if (bucket.bucketType !== 'allPublic') {
    await b2UpdateBucketType(apiUrl, authorizationToken, accountId, bucket.bucketId, 'allPublic')
    console.log('Bucket updated to allPublic')
  }

  const fileName = `test/${path.basename(localFile)}`
  const contentType = guessContentType(localFile)

  const stat = fs.statSync(localFile)
  const chunkSize = Math.min(50 * 1024 * 1024, stat.size)
  const totalParts = Math.ceil(stat.size / chunkSize)

  if (totalParts === 1) {
    console.log(`Uploading ${stat.size} bytes as single part...`)
    const { uploadUrl, authorizationToken: uploadAuthToken } = await b2GetUploadUrlForBucket(apiUrl, authorizationToken, bucket.bucketId)
    await b2UploadSingle(uploadUrl, uploadAuthToken, localFile, fileName, contentType)
  } else {
    console.log(`Uploading ${stat.size} bytes in ${totalParts} parts...`)
    const fileId = await b2StartLargeFile(apiUrl, authorizationToken, bucket.bucketId, fileName, contentType)
    const { uploadUrl, authorizationToken: uploadAuthToken } = await b2GetUploadPartUrl(apiUrl, authorizationToken, fileId)

    const fd = fs.openSync(localFile, 'r')
    const partSha1Array = []
    for (let part = 1; part <= totalParts; part++) {
      const start = (part - 1) * chunkSize
      const end = Math.min(start + chunkSize, stat.size)
      const length = end - start
      const buffer = Buffer.alloc(length)
      fs.readSync(fd, buffer, 0, length, start)
      console.log(`Uploading part ${part}/${totalParts} (${length} bytes)`) 
      await b2UploadPart(uploadUrl, uploadAuthToken, part, buffer)
      partSha1Array.push(sha1(buffer))
    }
    fs.closeSync(fd)

    await b2FinishLargeFile(apiUrl, authorizationToken, fileId, partSha1Array)
  }

  const publicUrl = `${downloadUrl}/file/${encodeURIComponent(BUCKET_NAME)}/${encodeURIComponent(fileName)}`
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
