const AWS = require('aws-sdk');

// Configure B2 (Backblaze) as S3-compatible storage
const s3 = new AWS.S3({
  endpoint: 'https://s3.us-west-004.backblazeb2.com',
  accessKeyId: '005de55171ab9b40000000001',
  secretAccessKey: 'K0056BA24XoLx+UyLRwzs8753ZBjFfc',
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

async function testB2Connection() {
  try {
    console.log('🧪 Testing B2 connection...');
    
    // List buckets to test connection
    const result = await s3.listBuckets().promise();
    console.log('✅ Connection successful!');
    console.log('📦 Available buckets:', result.Buckets.map(b => b.Name));
    
    // Check if our bucket exists
    const bucketExists = result.Buckets.some(b => b.Name === 'memory-finder-videos');
    
    if (bucketExists) {
      console.log('✅ Bucket "memory-finder-videos" already exists');
    } else {
      console.log('📦 Creating bucket "memory-finder-videos"...');
      await s3.createBucket({ Bucket: 'memory-finder-videos' }).promise();
      console.log('✅ Bucket created successfully');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testB2Connection();

