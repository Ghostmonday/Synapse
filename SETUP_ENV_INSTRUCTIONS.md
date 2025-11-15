# .env File Setup Instructions

## Quick Setup

1. **Copy the template:**
   ```bash
   cp .env.example .env
   ```

2. **Get your Supabase credentials:**
   - Go to your Supabase project dashboard
   - Navigate to: **Project Settings > API**
   - Copy:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **service_role key** (the secret one) → `SUPABASE_SERVICE_ROLE_KEY`

3. **Update your .env file with your actual values:**
   ```bash
   # Edit .env file
   nano .env  # or use your preferred editor
   ```

4. **Required variables (minimum to get started):**
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
   - `JWT_SECRET` - Generate a secure random string (see below)
   - `REDIS_URL` - Default: `redis://localhost:6379` (if running Redis locally)

5. **Generate a secure JWT_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output and paste it as your `JWT_SECRET` value.

## Verification

After setting up your .env file, verify it works:
```bash
# Check that required variables are set
node -e "require('dotenv').config(); console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'); console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');"
```

## Optional Variables

The following are optional and only needed if you're using those specific features:
- **VAPID keys** - For web push notifications
- **OpenAI API key** - For AI features
- **AWS credentials** - For S3 file storage
- **LiveKit credentials** - For video/audio
- **Agora credentials** - For video/audio

You can add these later as needed.
