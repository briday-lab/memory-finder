# Memory Finder - Wedding Video Search SaaS

Memory Finder is an AI-powered video processing SaaS designed for the wedding industry. Videographers can upload wedding videos, and couples can search for specific moments using natural language queries to get perfectly edited video clips.

## Features

- **Video Upload**: Secure video file upload with B2 (Backblaze) storage
- **AI Processing**: GPU-powered video processing with PodRun
- **Natural Language Search**: Search wedding moments using plain English
- **Instant Clips**: Get edited video clips of found moments
- **User Management**: Separate interfaces for videographers and couples
- **Project Organization**: Organize videos by wedding projects

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Storage**: Backblaze B2 (S3-compatible)
- **AI Processing**: PodRun (GPU processing)
- **Authentication**: Supabase Auth
- **UI Components**: Radix UI + Custom components

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Backblaze B2 account
- PodRun account

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd memory-finder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

4. Configure your environment variables in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Backblaze B2 Configuration
B2_APPLICATION_KEY_ID=your_b2_key_id
B2_APPLICATION_KEY=your_b2_key
B2_BUCKET_NAME=your_bucket_name
B2_ENDPOINT=your_b2_endpoint

# PodRun Configuration
PODRUN_API_KEY=your_podrun_api_key
PODRUN_ENDPOINT=https://api.podrun.com

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Enable Row Level Security (RLS) policies as defined in the schema

### Storage Setup

1. Create a Backblaze B2 bucket
2. Generate application keys with read/write permissions
3. Configure CORS settings for your domain

### Development

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── upload/        # File upload endpoint
│   │   └── search/        # Search endpoint
│   ├── dashboard/         # Dashboard page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── ui/                # Reusable UI components
│   ├── auth-provider.tsx  # Authentication context
│   ├── dashboard.tsx      # Main dashboard
│   └── landing-page.tsx   # Landing page
└── lib/                   # Utility libraries
    ├── supabase.ts        # Supabase client
    ├── b2.ts             # B2 storage client
    ├── podrun.ts         # PodRun API client
    └── utils.ts          # Utility functions
```

## API Endpoints

### POST /api/upload
Upload video files to B2 storage and start processing.

**Body**: FormData with `file` and `projectId`

**Response**:
```json
{
  "success": true,
  "file": {
    "id": "uuid",
    "filename": "string",
    "status": "pending|processing|completed|failed"
  }
}
```

### POST /api/search
Search for moments in wedding videos.

**Body**:
```json
{
  "query": "string",
  "projectId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "startTime": 120.5,
      "endTime": 135.2,
      "confidence": 0.95,
      "videoId": "uuid",
      "videoFilename": "string",
      "momentId": "uuid"
    }
  ],
  "query": "string",
  "totalResults": 5
}
```

## User Roles

### Videographer
- Upload wedding videos
- Create wedding projects
- Invite couples to projects
- Monitor processing status

### Couple
- Search for moments in their wedding videos
- View and download video clips
- Access only their assigned projects

## Database Schema

The application uses the following main tables:

- `users` - User accounts (videographers and couples)
- `wedding_projects` - Wedding projects linking videographers and couples
- `video_files` - Uploaded video files with processing status
- `audio_files` - Uploaded audio files (optional)
- `processing_jobs` - PodRun processing job tracking
- `video_moments` - AI-extracted moments from videos
- `search_queries` - User search queries
- `search_results` - Search results linking queries to moments
- `generated_clips` - Generated video clips from search results

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the GitHub repository.