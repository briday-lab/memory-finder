# Memory Finder - Project Context & Development Log

## Project Overview
Memory Finder is an AI-powered wedding video processing platform designed to think and act like a professional video editor. The system ingests raw wedding footage (30 GB+ clips, multi-camera, separate audio), preprocesses it into proxies and synchronized timelines, applies advanced AI-driven editing, and enables couples to retrieve moments via plain-English search queries.

## Current Implementation Status

### ✅ Completed Features

#### Authentication & User Management
- **AWS Cognito Integration**: Complete authentication system
  - User Pool: `us-east-2_iOQ186eix`
  - Client ID: `47ngeac5hkg68ui4blceq1thcl`
  - Google OAuth integration configured
  - Email/password authentication with confirmation codes
  - Custom user types: `videographer` and `couple`
  - Sign out functionality with token clearing

#### Database & Backend
- **PostgreSQL RDS**: `memory-finder-db.chsiq2iuy4fb.us-east-2.rds.amazonaws.com`
  - Database: `memoryfinder`
  - User: `memoryfinder`
  - Tables: `users`, `projects`, `files`, `video_moments`
  - Schema applied from `database-schema.sql`

#### Frontend & UI
- **Next.js 15.0.3** with TypeScript
- **Tailwind CSS** with custom styling
- **shadcn/ui** components
- **Responsive design** with mobile support

#### Videographer Dashboard
- **Event Management**: Create, edit, delete wedding events
- **Project Sharing**: Email invitations with shareable links
- **File Upload**: Video file management
- **Analytics**: Basic project analytics
- **User Interface**: Modern, intuitive design

#### Couple Dashboard
- **Project Access**: View shared wedding projects
- **Search Interface**: Natural language search (planned)
- **Video Player**: Secure video playback (planned)

### 🚧 In Progress Features

#### Video Processing Pipeline
- **AWS MediaConvert**: Configured for video processing
- **S3 Storage**: Raw video storage setup
- **Processing Workflows**: Step Functions orchestration (planned)

#### AI & Search
- **Semantic Search**: OpenSearch integration (planned)
- **AI Processing**: SageMaker models for shake/blur detection (planned)
- **Natural Language Queries**: Bedrock LLM integration (planned)

### 📋 Planned Features

#### Core Video Processing
- Multi-part uploads to S3 with Intelligent-Tiering
- Proxy generation (360p, 1080p, audio-only)
- Multi-camera synchronization
- Audio transcription and sync
- Timeline assembly and editing

#### AI-Powered Editing
- Shake detection and stabilization
- Blur detection and handling
- B-roll replacement and gap filling
- Sound flow optimization
- Professional editing decisions

#### Search & Retrieval
- Natural language query processing
- Semantic search over transcripts and metadata
- Moment retrieval and ranking
- Auto-edit generation
- Secure video delivery

## Technical Architecture

### Current Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, PostgreSQL
- **Authentication**: AWS Cognito
- **Database**: AWS RDS PostgreSQL
- **Storage**: AWS S3 (configured)
- **Processing**: AWS MediaConvert (configured)
- **Deployment**: AWS Amplify

### Planned AWS Services
- **S3**: Raw + proxy video storage
- **MediaConvert**: Proxy generation and exports
- **Batch/ECS**: Video transformations (FFmpeg, OpenCV)
- **Transcribe**: Speech-to-text
- **Rekognition**: Face detection, emotion recognition
- **SageMaker**: Custom ML training
- **Step Functions**: Workflow orchestration
- **OpenSearch**: Semantic search
- **DynamoDB**: Metadata storage
- **CloudFront**: Content delivery
- **Bedrock**: LLM for natural language processing

## Key Configuration Details

### AWS Cognito
```typescript
// cognito-config.ts
export const cognitoConfig = {
  region: 'us-east-2',
  userPoolId: 'us-east-2_iOQ186eix',
  userPoolWebClientId: '47ngeac5hkg68ui4blceq1thcl',
  clientSecret: '5jlueecvviuh4t48af4064v1l5rk1dp4df74md00u60jbau440e',
  domain: 'https://main.d25s4o2tenvmk9.amplifyapp.com',
  redirectSignIn: 'https://main.d25s4o2tenvmk9.amplifyapp.com/dashboard',
  redirectSignOut: 'https://main.d25s4o2tenvmk9.amplifyapp.com/',
  responseType: 'code' as const,
}
```

### Database Connection
```typescript
// database.ts
const dbConfig = {
  host: 'memory-finder-db.chsiq2iuy4fb.us-east-2.rds.amazonaws.com',
  port: 5432,
  database: 'memoryfinder',
  user: 'memoryfinder',
  password: 'MemoryFinder2024!',
  ssl: { rejectUnauthorized: false },
}
```

### Environment Variables (SSM Parameter Store)
- `/memory-finder/database/host`
- `/memory-finder/database/name`
- `/memory-finder/database/user`
- `/memory-finder/database/password`

## Development Workflow

### Current State
1. **Authentication**: ✅ Complete
2. **User Management**: ✅ Complete
3. **Event Management**: ✅ Complete
4. **File Upload**: 🚧 Basic implementation
5. **Video Processing**: 📋 Planned
6. **AI Features**: 📋 Planned
7. **Search**: 📋 Planned

### Next Steps
1. **Video Upload Pipeline**: Implement S3 multi-part uploads
2. **Processing Workflows**: Set up Step Functions for video processing
3. **AI Integration**: Implement shake/blur detection
4. **Search Engine**: Set up OpenSearch for semantic search
5. **Video Player**: Implement secure video playback
6. **Natural Language**: Integrate Bedrock for query processing

## Key Files & Components

### Authentication
- `src/lib/cognito-auth.ts` - Cognito authentication service
- `src/lib/cognito-config.ts` - Configuration
- `src/components/landing-page-full.tsx` - Login/signup interface

### Dashboards
- `src/components/videographer-dashboard.tsx` - Videographer interface
- `src/components/couple-dashboard.tsx` - Couple interface
- `src/app/dashboard/page.tsx` - Dashboard routing

### API Routes
- `src/app/api/projects/route.ts` - Project CRUD operations
- `src/app/api/projects/[id]/route.ts` - Individual project operations
- `src/app/api/users/route.ts` - User management
- `src/app/api/upload/route.ts` - File upload handling

### Database
- `src/lib/database.ts` - PostgreSQL connection
- `database-schema.sql` - Database schema

## Deployment Information

### Current Deployment
- **Platform**: AWS Amplify
- **URL**: https://main.d25s4o2tenvmk9.amplifyapp.com/
- **Build**: Next.js static generation
- **Environment**: Production

### Build Configuration
- `amplify.yml` - Amplify build spec
- `next.config.ts` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.mjs` - PostCSS configuration

## Known Issues & Solutions

### Resolved Issues
1. **Tailwind CSS Compilation**: Fixed by recreating config files
2. **Database Connection**: Fixed by creating database and applying schema
3. **Authentication Flow**: Fixed by implementing proper Cognito integration
4. **Event Creation**: Fixed by resolving database connection issues

### Current Limitations
1. **Video Processing**: Basic file upload only, no processing pipeline
2. **Search**: No semantic search implementation yet
3. **AI Features**: No ML models integrated yet
4. **Video Player**: No secure video playback yet

## Security Considerations

### Implemented
- AWS Cognito for authentication
- Role-based access control
- Database encryption at rest
- HTTPS/TLS in transit

### Planned
- S3 pre-signed URLs for secure access
- CloudTrail logging
- IAM role-based permissions
- Content encryption

## Performance & Scalability

### Current
- Serverless architecture with Next.js
- Database connection pooling
- CDN via CloudFront (planned)

### Planned
- Auto-scaling with Lambda/ECS
- Multi-region S3 for global clients
- Async processing with notifications
- Batch processing for heavy workloads

## Future Extensions

### Phase 2 Features
- Auto music sync with licensed tracks
- AI trailer generator for highlights
- Collaborative editing portal
- Marketplace integration with vendors

### Phase 3 Features
- Mobile app development
- Advanced AI editing features
- Multi-language support
- Advanced analytics and reporting

---

## Development Notes

### Recent Changes
- Fixed database connection and project creation
- Implemented comprehensive event management
- Added edit/delete functionality for projects
- Enhanced sharing with email notifications
- Fixed Tailwind CSS compilation issues
- Implemented proper Cognito authentication flow

### Next Development Session
1. Implement video upload pipeline with S3
2. Set up basic video processing workflow
3. Add video player component
4. Implement basic search functionality
5. Add AI processing capabilities

### Contact & Support
- Project Repository: GitHub
- Deployment: AWS Amplify
- Database: AWS RDS PostgreSQL
- Authentication: AWS Cognito
