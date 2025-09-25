# Memory Finder AI Intelligence Workflow

## 🎯 **Overview**
Memory Finder transforms raw wedding videos into an intelligent, searchable experience using AI-powered analysis and semantic search.

## 📋 **Complete Workflow**

### **Phase 1: File Upload & Initial Processing**
```
Videographer Uploads Video → S3 Raw Storage → Trigger Processing Pipeline
```

1. **File Upload**
   - Video files uploaded to `memory-finder-raw` S3 bucket
   - File metadata stored in database (`files` table)
   - Processing status set to "uploaded"

2. **Processing Trigger**
   - AWS EventBridge detects new file upload
   - Triggers Step Functions workflow
   - Processing status updated to "processing"

### **Phase 2: Video Analysis Pipeline**
```
Raw Video → Transcoding → AI Analysis → Structured Data → Database Storage
```

#### **2.1 Video Transcoding (AWS Elemental MediaConvert)**
- **Input**: Raw video files (MP4, MOV, MKV)
- **Output**: 
  - Proxy videos (lower resolution for web playback)
  - Thumbnails (keyframe extraction)
  - Audio tracks (for transcription)
- **Storage**: 
  - Proxies → `memory-finder-proxies` bucket
  - Thumbnails → `memory-finder-thumbnails` bucket

#### **2.2 Audio Transcription (Amazon Transcribe)**
- **Input**: Audio track from video
- **Output**: 
  - Full transcript with timestamps
  - Speaker identification (if multiple speakers)
  - Confidence scores
- **Storage**: Database (`video_transcripts` table)

#### **2.3 Computer Vision Analysis (AWS Rekognition)**
- **Input**: Video frames (sampled every 2-3 seconds)
- **Output**:
  - Object detection (flowers, cake, rings, etc.)
  - Scene classification (ceremony, reception, getting ready)
  - Face detection and recognition
  - Emotion analysis
  - Activity recognition
- **Storage**: Database (`video_analysis` table)

#### **2.4 Shot Detection & Scene Segmentation**
- **Input**: Video frames
- **Output**:
  - Shot boundaries (cuts, transitions)
  - Scene changes
  - Key moments identification
- **Storage**: Database (`video_segments` table)

### **Phase 3: Semantic Intelligence**
```
Structured Data → Embedding Generation → Vector Storage → Search Index
```

#### **3.1 Content Embedding Generation**
- **Input**: 
  - Transcripts
  - Visual descriptions
  - Scene classifications
  - Object detections
- **Process**: 
  - Combine text and visual data
  - Generate embeddings using OpenAI/Bedrock
  - Create semantic vectors
- **Output**: Vector embeddings stored in database

#### **3.2 Moment Creation**
- **Input**: Segmented video data
- **Process**:
  - Combine transcript + visual + scene data
  - Create meaningful moments (30-60 second clips)
  - Generate moment descriptions
  - Calculate relevance scores
- **Output**: Database (`video_moments` table)

### **Phase 4: Intelligent Search & Delivery**
```
User Query → Embedding → Vector Search → Ranked Results → Video Clips
```

#### **4.1 Query Processing**
- **Input**: Natural language query ("wedding vows", "first dance")
- **Process**:
  - Generate query embedding
  - Perform vector similarity search
  - Rank results by relevance
- **Output**: Ranked list of video moments

#### **4.2 Intelligent Video Compilation**
- **Input**: Multiple related moments from search across different video files
- **Process**:
  - Discover all related moments across project videos
  - Analyze framing quality and remove bad shots
  - Create seamless transitions between moments
  - Concatenate into one cohesive compilation
  - Apply color correction and audio synchronization
- **Output**: One beautifully edited compilation video (2-5 minutes)

## 🏗️ **Technical Architecture**

### **AWS Services Used**
```
S3 (Storage) → EventBridge (Events) → Step Functions (Orchestration)
    ↓
MediaConvert (Transcoding) → Transcribe (Speech) → Rekognition (Vision)
    ↓
Lambda (Processing) → RDS (Database) → Bedrock/OpenAI (AI)
    ↓
API Gateway (Search) → CloudFront (Delivery)
```

### **Database Schema**
```sql
-- Core Tables
files (id, project_id, filename, s3_key, status, created_at)
projects (id, videographer_id, couple_id, project_name, status)
video_transcripts (id, file_id, transcript_text, timestamps, confidence)
video_analysis (id, file_id, analysis_type, data, timestamp)
video_segments (id, file_id, start_time, end_time, segment_type)
video_moments (id, file_id, start_time, end_time, description, embedding_data)
search_queries (id, project_id, user_id, query_text, query_embedding_data)
```

## 🎬 **User Experience Flow**

### **For Videographers**
1. **Upload** wedding videos
2. **Monitor** processing status
3. **Share** completed project with couple
4. **Track** usage analytics

### **For Couples**
1. **Receive** invitation link
2. **Search** using natural language
3. **Browse** curated moments
4. **Watch** personalized video clips
5. **Share** favorite moments

## 🔍 **Search Intelligence Examples**

### **Query: "wedding vows"**
- **Finds**: Moments with vow-related transcripts
- **Visual**: Ceremony scenes, altar shots
- **Context**: Emotional moments, ring exchanges

### **Query: "first dance"**
- **Finds**: All first dance moments across multiple video files
- **Visual**: Couple dancing, romantic lighting, audience reactions
- **Context**: Reception moments, music cues, emotional reactions
- **Output**: One seamless 3-minute compilation of the complete first dance experience

### **Query: "cake cutting"**
- **Finds**: All cake cutting moments across multiple video files
- **Visual**: Cake table, cutting ceremony, feeding each other
- **Context**: Reception activities, celebration, guest reactions
- **Output**: One seamless 2-minute compilation of the complete cake cutting experience

## 📊 **AI Processing Pipeline**

### **Real-time Processing**
- **Upload**: Immediate file storage
- **Transcoding**: 5-15 minutes per video
- **AI Analysis**: 10-30 minutes per video
- **Search Ready**: 15-45 minutes total

### **Batch Processing**
- **Multiple files**: Parallel processing
- **Large projects**: Queue management
- **Error handling**: Retry mechanisms
- **Progress tracking**: Real-time updates

## 🎯 **Intelligence Features**

### **Semantic Search**
- Natural language understanding
- Context-aware results
- Multi-modal search (text + visual)
- Relevance ranking

### **Moment Detection**
- Automatic scene segmentation
- Key moment identification
- Emotional peak detection
- Story arc recognition

### **Personalization**
- Couple-specific results
- Preference learning
- Usage pattern analysis
- Recommendation engine

## 🚀 **Implementation Priority**

### **Phase 1: Core Processing** ✅
- [x] File upload and storage
- [x] Basic video playback
- [x] Project management
- [x] User authentication

### **Phase 2: AI Pipeline** 🚧
- [ ] Video transcoding
- [ ] Audio transcription
- [ ] Computer vision analysis
- [ ] Shot detection

### **Phase 3: Intelligence** 📋
- [ ] Embedding generation
- [ ] Vector search
- [ ] Moment creation
- [ ] Semantic search

### **Phase 4: Enhancement** 📋
- [ ] Video clip generation
- [ ] Advanced analytics
- [ ] Machine learning optimization
- [ ] Performance tuning

## 💡 **Key Benefits**

### **For Videographers**
- **Automated processing**: No manual editing required
- **Intelligent organization**: AI categorizes content
- **Client satisfaction**: Easy sharing and access
- **Business growth**: Premium service offering

### **For Couples**
- **Instant access**: Find moments in seconds
- **Natural search**: Use everyday language
- **Personalized experience**: AI understands context
- **Memorable moments**: Never miss important scenes

---

**This workflow transforms raw wedding footage into an intelligent, searchable memory bank that couples can explore naturally and intuitively.**
