# Memory Finder AI Workflow Diagram

## 🎬 **Complete Intelligence Pipeline**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MEMORY FINDER AI WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────────────────┘

📹 VIDEO UPLOAD PHASE
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Videographer│───▶│   S3 Raw    │───▶│ EventBridge │───▶│Step Functions│
│   Uploads   │    │  Storage    │    │   Trigger   │    │  Workflow   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘

🔧 PROCESSING PHASE
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│MediaConvert │───▶│  Transcribe │───▶│ Rekognition │───▶│ Shot Detect │
│ Transcoding │    │   Speech    │    │   Vision    │    │  Segments   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Proxies   │    │ Transcripts │    │   Objects   │    │   Scenes    │
│ Thumbnails  │    │  Timestamps │    │  Emotions   │    │  Moments    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘

🧠 INTELLIGENCE PHASE
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Combine   │───▶│  Generate   │───▶│   Vector    │───▶│   Store     │
│   Data      │    │ Embeddings  │    │   Search    │    │  Database   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Multi-modal  │    │   OpenAI    │    │ Similarity  │    │Video Moments│
│  Content    │    │  Bedrock    │    │  Ranking    │    │ Embeddings │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘

🔍 SEARCH PHASE
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Couple    │───▶│   Query     │───▶│   Vector    │───▶│   Ranked    │
│   Search    │    │ Embedding   │    │   Search    │    │  Results    │
└─────────────┘    └─────────────┘    ┌─────────────┐    └─────────────┘
       │                   │          │   Database   │           │
       ▼                   ▼          │   Query     │           ▼
┌─────────────┐    ┌─────────────┐    └─────────────┘    ┌─────────────┐
│"wedding     │    │   Semantic  │                       │   Video     │
│ vows"       │    │   Vector    │                       │   Clips     │
└─────────────┘    └─────────────┘                       └─────────────┘

🎬 DELIVERY PHASE
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Extract   │───▶│   Apply     │───▶│   Generate  │───▶│   Deliver   │
│  Segments   │    │Transitions  │    │   Metadata  │    │   to User   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Video     │    │   Smooth    │    │   Titles    │    │   Playback  │
│  Moments    │    │   Cuts      │    │  Overlays   │    │   Ready     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 🔄 **Processing Flow Details**

### **1. Upload & Storage**
```
Videographer → S3 Raw Bucket → Database Record → Processing Trigger
```

### **2. AI Analysis Pipeline**
```
Raw Video → Transcoding → Transcription → Vision Analysis → Shot Detection
    ↓           ↓            ↓              ↓              ↓
Proxies → Transcripts → Objects/Scenes → Segments → Moments
```

### **3. Intelligence Generation**
```
Structured Data → Content Combination → Embedding Generation → Vector Storage
    ↓                    ↓                    ↓                ↓
Multi-modal → Semantic Understanding → Search Index → Database
```

### **4. Search & Delivery**
```
User Query → Embedding → Vector Search → Results → Video Clips → Playback
    ↓           ↓            ↓            ↓          ↓           ↓
Natural → Semantic → Similarity → Ranked → Extracted → Ready
Language   Vector     Matching    Results   Segments   to Watch
```

## 📊 **Data Flow Architecture**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AWS SERVICES                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│  S3 Storage  │  EventBridge  │  Step Functions  │  MediaConvert  │  Transcribe │
│  Rekognition │  Lambda       │  RDS Database    │  Bedrock      │  CloudFront │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA STORAGE                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Raw Videos  │  Proxies     │  Thumbnails  │  Transcripts  │  Analysis Data │
│  Embeddings  │  Moments     │  Segments    │  Search Logs  │  User Queries  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              INTELLIGENCE                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Speech-to-Text │  Object Detection │  Scene Classification │  Face Recognition │
│  Emotion Analysis│  Shot Detection  │  Moment Creation      │  Semantic Search │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 **Key Intelligence Features**

### **Multi-Modal Understanding**
- **Audio**: Speech recognition, speaker identification, emotion detection
- **Visual**: Object detection, scene classification, face recognition
- **Temporal**: Shot detection, scene transitions, moment boundaries
- **Semantic**: Content understanding, context awareness, relevance ranking

### **Natural Language Search**
- **Query**: "wedding vows" → Finds vow-related moments
- **Query**: "first dance" → Locates dance floor scenes
- **Query**: "cake cutting" → Identifies cake ceremony moments
- **Query**: "emotional moments" → Discovers high-emotion scenes

### **Intelligent Moment Creation**
- **Automatic Segmentation**: Break videos into meaningful moments
- **Context Awareness**: Understand what's happening in each moment
- **Relevance Scoring**: Rank moments by importance and relevance
- **Multi-Modal Fusion**: Combine audio, visual, and temporal data

---

**This workflow transforms raw wedding footage into an intelligent, searchable memory bank that couples can explore naturally and intuitively.**
