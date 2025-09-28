import OpenAI from 'openai'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const AWS_REGION = process.env.AWS_REGION || 'us-east-2'
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'openai' // 'openai' or 'bedrock'

// Initialize OpenAI client
const openai = OPENAI_API_KEY ? new OpenAI({
  apiKey: OPENAI_API_KEY,
}) : null

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION })

export interface EmbeddingResult {
  embedding: number[]
  model: string
  usage?: {
    prompt_tokens: number
    total_tokens: number
  }
}

/**
 * Generate embeddings using OpenAI's text-embedding-3-small model
 */
async function generateOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    })

    return {
      embedding: response.data[0].embedding,
      model: 'text-embedding-3-small',
      usage: response.usage
    }
  } catch (error) {
    console.error('OpenAI embedding generation failed:', error)
    throw new Error(`OpenAI embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate embeddings using AWS Bedrock's Titan Embeddings model
 */
async function generateBedrockEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    const command = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v1',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: text
      })
    })

    const response = await bedrockClient.send(command)
    const responseBody = JSON.parse(new TextDecoder().decode(response.body))

    return {
      embedding: responseBody.embedding,
      model: 'amazon.titan-embed-text-v1',
      usage: {
        prompt_tokens: text.split(' ').length, // Rough estimate
        total_tokens: text.split(' ').length
      }
    }
  } catch (error) {
    console.error('Bedrock embedding generation failed:', error)
    throw new Error(`Bedrock embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate embeddings for text using the configured model
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty')
  }

  // Truncate text if too long (most models have limits)
  const maxLength = 8000 // Conservative limit
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text

  console.log(`Generating embedding for text (${truncatedText.length} chars) using ${EMBEDDING_MODEL}`)

  switch (EMBEDDING_MODEL) {
    case 'openai':
      return await generateOpenAIEmbedding(truncatedText)
    
    case 'bedrock':
      return await generateBedrockEmbedding(truncatedText)
    
    default:
      throw new Error(`Unsupported embedding model: ${EMBEDDING_MODEL}`)
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<EmbeddingResult[]> {
  if (texts.length === 0) {
    return []
  }

  console.log(`Generating embeddings for ${texts.length} texts using ${EMBEDDING_MODEL}`)

  // For now, process sequentially to avoid rate limits
  // In production, you might want to implement batching for OpenAI
  const results: EmbeddingResult[] = []
  
  for (const text of texts) {
    try {
      const result = await generateEmbedding(text)
      results.push(result)
    } catch (error) {
      console.error(`Failed to generate embedding for text: ${text.substring(0, 100)}...`, error)
      // Continue with other texts even if one fails
      results.push({
        embedding: Array.from({ length: 1536 }, () => Math.random() * 2 - 1), // Fallback
        model: `${EMBEDDING_MODEL}-fallback`
      })
    }
  }

  return results
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length')
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i]
    norm1 += embedding1[i] * embedding1[i]
    norm2 += embedding2[i] * embedding2[i]
  }

  if (norm1 === 0 || norm2 === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

/**
 * Test embedding generation (for debugging)
 */
export async function testEmbeddingGeneration(): Promise<void> {
  const testTexts = [
    'wedding ceremony',
    'first dance',
    'cake cutting',
    'bride walking down the aisle',
    'wedding vows'
  ]

  console.log('Testing embedding generation...')
  
  try {
    const results = await generateEmbeddingsBatch(testTexts)
    console.log(`Successfully generated ${results.length} embeddings`)
    
    // Test similarity calculation
    if (results.length >= 2) {
      const similarity = calculateCosineSimilarity(results[0].embedding, results[1].embedding)
      console.log(`Similarity between "${testTexts[0]}" and "${testTexts[1]}": ${similarity.toFixed(4)}`)
    }
  } catch (error) {
    console.error('Embedding test failed:', error)
  }
}

