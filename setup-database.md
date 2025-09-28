# Database Setup Instructions

## Step 1: Run the Database Schema

1. Go to your Supabase project: https://seurlffcnedcbwfwfhmc.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New Query"**
4. Copy and paste the entire contents of `supabase-schema.sql` into the editor
5. Click **"Run"** to execute the schema

## Step 2: Verify Tables Created

After running the schema, you should see these tables in the **Table Editor**:

- `users`
- `wedding_projects`
- `video_files`
- `audio_files`
- `processing_jobs`
- `video_moments`
- `search_queries`
- `search_results`
- `generated_clips`

## Step 3: Enable Authentication

1. Go to **Authentication** → **Settings**
2. Make sure **"Enable email confirmations"** is turned OFF for development
3. Go to **Authentication** → **Users** to see registered users

## Step 4: Test the Application

Once the database is set up, you can:

1. Start the development server: `npm run dev`
2. Visit http://localhost:3000
3. Create a new account (videographer or couple)
4. The user will be automatically added to the `users` table

## Next Steps

After the database is set up, we'll configure:
1. **Backblaze B2** for file storage
2. **RunPod** for AI processing
3. Test the complete workflow

Let me know when you've completed the database setup!

