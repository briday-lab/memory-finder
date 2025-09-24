// Note: This test requires the environment variables to be set
// Add EMBEDDING_MODEL=bedrock and AWS_REGION=us-east-2 to your .env.local

async function testEmbeddings() {
  console.log('Testing embedding generation...');
  console.log('Note: This test requires proper environment configuration.');
  console.log('Make sure EMBEDDING_MODEL and AWS_REGION are set in .env.local');
  
  // For now, just show the configuration
  console.log('\nCurrent configuration:');
  console.log(`EMBEDDING_MODEL: ${process.env.EMBEDDING_MODEL || 'not set'}`);
  console.log(`AWS_REGION: ${process.env.AWS_REGION || 'not set'}`);
  console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'set' : 'not set'}`);
  
  console.log('\nTo test embeddings:');
  console.log('1. Add EMBEDDING_MODEL=bedrock to .env.local');
  console.log('2. Add AWS_REGION=us-east-2 to .env.local');
  console.log('3. Run: node -e "require(\'./src/lib/embeddings.ts\').testEmbeddingGeneration()"');
}

// Run the test
testEmbeddings().catch(console.error);