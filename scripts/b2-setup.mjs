/* eslint-disable */
// Minimal script to authorize with Backblaze B2 and ensure bucket exists

const KEY_ID = '005de55171ab9b40000000001'
const APP_KEY = 'K0056BA24XoLx+UyLRwzs8753ZBjFfc'
const BUCKET_NAME = 'memory-finder-videos'

async function main() {
  try {
    const authHeader = Buffer.from(`${KEY_ID}:${APP_KEY}`).toString('base64')
    const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${authHeader}` },
    })
    const auth = await authRes.json()
    if (!authRes.ok) {
      console.error('Auth failed:', auth)
      process.exit(1)
    }
    console.log('Auth OK, accountId:', auth.accountId)

    const apiUrl = auth.apiUrl
    const authToken = auth.authorizationToken

    // List buckets
    let res = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
      method: 'POST',
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId: auth.accountId }),
    })
    let data = await res.json()
    if (!res.ok) {
      console.error('List buckets failed:', data)
      process.exit(1)
    }

    const exists = (data.buckets || []).some((b) => b.bucketName === BUCKET_NAME)
    if (exists) {
      console.log(`Bucket exists: ${BUCKET_NAME}`)
    } else {
      console.log(`Creating bucket: ${BUCKET_NAME}`)
      res = await fetch(`${apiUrl}/b2api/v2/b2_create_bucket`, {
        method: 'POST',
        headers: {
          Authorization: authToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: auth.accountId,
          bucketName: BUCKET_NAME,
          bucketType: 'allPrivate',
        }),
      })
      data = await res.json()
      if (!res.ok) {
        console.error('Create bucket failed:', data)
        process.exit(1)
      }
      console.log('Bucket created:', data.bucketName)
    }

    console.log('Done.')
  } catch (e) {
    console.error('Error:', e)
    process.exit(1)
  }
}

main()
