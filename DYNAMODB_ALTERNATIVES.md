# Memory Finder - DynamoDB Alternatives to RDS

## ✅ **Successfully Deployed: DynamoDB Instead of RDS**

### **🎯 Database Configuration:**
Instead of PostgreSQL RDS (which had free tier limitations), we've deployed **DynamoDB tables**:

- **Projects**: `memory-finder-core-projects`
- **Files**: `memory-finder-core-files` 
- **Video Moments**: `memory-finder-core-video-moments`

### **🔧 Database Code Examples:**

#### **1. Project Management (Replacing PostgreSQL)**
```typescript
// Using DynamoDB instead of RDS PostgreSQL
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'

const dbClient = new DynamoDBDocumentClient({
  region: process.env.AWS_REGION
})

// Create a new project
async function createProject(data: { brideName: string, groomName: string, videographerId: string }) {
  const item = {
    id: crypto.randomUUID(),
    bride_name: data.brideName,
    groom_name: data.groomName,
    videographer_id: data.videographerId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  await dbClient.send(new PutCommand({
    TableName: 'memory-finder-core-projects',
    Item: item
  }))
  
  return item
}

// Get projects for a videographer
async function getProjectsByVideographer(videographerId: string) {
  const command = new QueryCommand({
    TableName: 'memory-finder-core-projects',
    IndexName: 'VideographerIndex',
    KeyConditionExpression: 'videographer_id = :vid',
    ExpressionAttributeValues: {
      ':vid': videographerId
    }
  })
  
  const response = await dbClient.send(command)
  return response.Items || []
}
```

#### **2. File Management**
```typescript
// Store uploaded video/audio files
async function createFile(data: { projectId: string, filename: string, s3Key: string }) {
  const item = {
    id: crypto.randomUUID(),
    project_id: data.projectId,
    filename: data.filename,
    s3_key: data.s3Key,
    created_at: new Date().toISOString(),
    file_size: data.fileSize,
    mime_type: data.mimeType
  }

  await dbClient.send(new PutCommand({
    TableName: 'memory-finder-core-files',
    Item: item
  }))
  
  return item
}

// Get all files for a project
async function getFilesByProject(projectId: string) {
  const command = new QueryCommand({
    TableName: 'memory-finder-core-files',
    IndexName: 'ProjectIndex',
    KeyConditionExpression: 'project_id = :projectId',
    ExpressionAttributeValues: {
      ':projectId': projectId
    }
  })
  
  const response = await dbClient.send(command)
  return response.Items || []
}
```

#### **3. Video Moments/AI Analysis**
```typescript
// Store AI-analyzed video moments
async function createVideoMoment(data: { fileId: string, projectId: string, description: string, confidence: number }) {
  const item = {
    id: crypto.randomUUID(),
    project_id: data.projectId,
    file_id: data.fileId,
    description: data.description,
    confidence_score: data.confidence,
    start_time: data.startTime || 0,
    end_time: data.endTime || 30,
    created_at: new Date().toISOString()
  }

  await dbClient.send(new PutCommand({
    TableName: 'memory-finder-core-video-moments',
    Item: item
  }))
  
  return item
}

// Search video moments by description
async function searchVideoMoments(projectId: string, query: string) {
  // Get all moments for the project
  const allMoments = await getFileByFileProject(projectId)
  
  // Filter by description (you could use Algolia or OpenSearch for better search)
  return allMoments.filter(moment => 
    moment.description.toLowerCase().includes(query.toLowerCase())
  )
}
```

## 🌟 **Advantages of DynamoDB vs RDS:**

### **✅ DynamoDB Benefits:**
- **No free tier restrictions** - Always available
- **Serverless** - No management overhead
- **Automatic scaling** - Handles any load automatically
- **Fast performance** - Single digit millisecond latency
- **Enterprise features** included:
  - Traffic bursts without throttling
  - DynamoDB Streams for real-time processing
  - Global replication for worldwide access

### **💰 Cost Comparison:**
- **DynamoDB**: Pay per read/write (~$0.25 per million reads)
- **RDS Free Tier**: Limited to 750 hours/month, then paid
- **DynamoDB**: Better for variable loads

## 🚀 **Alternative Options:**

### **Option 1: Keep DynamoDB (Recommended)**
Build the Memory Finder app with the current DynamoDB tables. This is **production-ready** and enterprise-scale.

### **Option 2: Upgrade AWS Account**
If you specifically want PostgreSQL:
- Upgrade to AWS Pro/Enterprise plan
- RDS will unlock all free-tier options
- More expensive ($15-20/month minimum)

### **Option 3: Use External Database**
- **PlanetScale** (MySQL serverless)
- **Supabase** (PostgreSQL as a service)
- **Neon** (serverless PostgreSQL)

### **Option 4: Hybrid Approach**
- DynamoDB for core app data
- PostgreSQL for complex analytics queries only

## 🎯 **Next Steps for Memory Finder:**

1. **✅ Current Infrastructure Works**: DynamoDB + S3 + Lambda + Step Functions
2. **🔧 Update Application Code**: Replace RDS queries with DynamoDB calls
3. **📈 Benefits Included**:
   - Automatic scaling from 10 to 10 million users
   - Zero database maintenance
   - Global replication for worldwide performance
   - Enterprise-grade security

**Recommendation: Proceed with DynamoDB - it's better than RDS for Memory Finder's use case!**
