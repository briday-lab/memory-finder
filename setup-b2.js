const AWS = require('aws-sdk');

// Configure B2 (Backblaze) as S3-compatible storage
const s3 = new AWS.S3({
  endpoint: 'https://s3.us-west-004.backblazeb2.com',
  accessKeyId: '005de55171ab9b40000000001',
  secretAccessKey: 'K0056BA24XoLx+UyLRwzs8753ZBjFfc',
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

async function setupB2Bucket() {
  try {
    console.log('🚀 Setting up B2 bucket for Memory Finder...');
    
    // Check if bucket exists
    try {
      await s3.headBucket({ Bucket: 'memory-finder-videos' }).promise();
      console.log('✅ Bucket "memory-finder-videos" already exists');
    } catch (error) {
      if (error.statusCode === 404) {
        // Bucket doesn't exist, create it
        console.log('📦 Creating bucket "memory-finder-videos"...');
        await s3.createBucket({ Bucket: 'memory-finder-videos' }).promise();
        console.log('✅ Bucket "memory-finder-videos" created successfully');
      } else {
        throw error;
      }
    }

    // Set up CORS configuration
    console.log('🔧 Setting up CORS configuration...');
    const corsConfig = {
      Bucket: 'memory-finder-videos',
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: ['http://localhost:3000', 'https://your-domain.com'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000
          }
        ]
      }
    };

    await s3.putBucketCors(corsConfig).promise();
    console.log('✅ CORS configuration set up successfully');

    // Test upload
    console.log('🧪 Testing file upload...');
    const testContent = 'Hello Memory Finder!';
    const uploadParams = {
      Bucket: 'memory-finder-videos',
      Key: 'test/test-file.txt',
      Body: testContent,
      ContentType: 'text/plain'
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    console.log('✅ Test file uploaded successfully:', uploadResult.Location);

    // Test download
    console.log('🧪 Testing file download...');
    const downloadParams = {
      Bucket: 'memory-finder-videos',
      Key: 'test/test-file.txt'
    };

    const downloadResult = await s3.getObject(downloadParams).promise();
    const content = downloadResult.Body.toString();
    console.log('✅ Test file downloaded successfully:', content);

    // Clean up test file
    console.log('🧹 Cleaning up test file...');
    await s3.deleteObject({ Bucket: 'memory-finder-videos', Key: 'test/test-file.txt' }).promise();
    console.log('✅ Test file cleaned up');

    console.log('\n🎉 B2 setup completed successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Set up the database schema in Supabase');
    console.log('   2. Configure RunPod API key');
    console.log('   3. Test the complete application');

  } catch (error) {
    console.error('❌ Error setting up B2:', error.message);
    process.exit(1);
  }
}

setupB2Bucket();
