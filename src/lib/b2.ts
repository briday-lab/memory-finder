import AWS from 'aws-sdk'

// Configure B2 (Backblaze) as S3-compatible storage
const s3 = new AWS.S3({
  endpoint: process.env.B2_ENDPOINT,
  accessKeyId: process.env.B2_APPLICATION_KEY_ID,
  secretAccessKey: process.env.B2_APPLICATION_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
})

export const uploadToB2 = async (
  file: Buffer,
  key: string,
  contentType: string
) => {
  const params = {
    Bucket: process.env.B2_BUCKET_NAME!,
    Key: key,
    Body: file,
    ContentType: contentType,
  }

  return s3.upload(params).promise()
}

export const getB2SignedUrl = (key: string, expiresIn: number = 3600) => {
  const params = {
    Bucket: process.env.B2_BUCKET_NAME!,
    Key: key,
    Expires: expiresIn,
  }

  return s3.getSignedUrl('getObject', params)
}

export const deleteFromB2 = async (key: string) => {
  const params = {
    Bucket: process.env.B2_BUCKET_NAME!,
    Key: key,
  }

  return s3.deleteObject(params).promise()
}

