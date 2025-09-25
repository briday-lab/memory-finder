const { S3Client, CreateBucketCommand, PutBucketCorsCommand } = require('@aws-sdk/client-s3')

const s3Client = new S3Client({ 
  region: 'us-east-2' 
})

async function createCompilationsBucket() {
  const bucketName = 'memory-finder-compilations-120915929747-us-east-2'
  
  try {
    console.log(`🪣 Creating S3 bucket: ${bucketName}`)
    
    // Create bucket
    const createCommand = new CreateBucketCommand({
      Bucket: bucketName,
      CreateBucketConfiguration: {
        LocationConstraint: 'us-east-2'
      }
    })
    
    await s3Client.send(createCommand)
    console.log(`✅ Created bucket: ${bucketName}`)
    
    // Configure CORS
    const corsCommand = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000
          }
        ]
      }
    })
    
    await s3Client.send(corsCommand)
    console.log(`✅ Configured CORS for bucket: ${bucketName}`)
    
    console.log('🎉 Compilations bucket is ready!')
    console.log('')
    console.log('Environment variables to add to .env.local:')
    console.log(`S3_COMPILATIONS_BUCKET=${bucketName}`)
    
  } catch (error) {
    if (error.name === 'BucketAlreadyOwnedByYou') {
      console.log(`✅ Bucket ${bucketName} already exists`)
    } else if (error.name === 'BucketAlreadyExists') {
      console.log(`⚠️  Bucket ${bucketName} already exists (owned by someone else)`)
    } else {
      console.error('❌ Error creating bucket:', error.message)
    }
  }
}

createCompilationsBucket()
