# Environment Variables Setup Guide

## Required Apple Sign-In Variables

### 1. APPLE_TEAM_ID
- **What it is:** Your 10-character Apple Developer Team ID
- **Where to find it:** https://developer.apple.com/account → Membership → Team ID
- **Example:** `R7KX4HNBFY`
- **Format:** 10 characters, alphanumeric

### 2. APPLE_SERVICE_ID
- **What it is:** Your App's Service ID (Client ID)
- **Value:** `com.ghostmonday.sinapse`
- **Where to find it:** https://developer.apple.com/account/resources/identifiers/list → Services IDs
- **Note:** Must match the Service ID configured in Apple Developer Portal

### 3. APPLE_KEY_ID
- **What it is:** Your 20-character Auth Key ID
- **Where to find it:** https://developer.apple.com/account/resources/authkeys/list
- **Example:** `ABC123DEF456GHI789JK`
- **Format:** 20 characters, alphanumeric
- **Note:** Create a new key if you don't have one (can only download once!)

### 4. APPLE_PRIVATE_KEY
- **What it is:** The PEM-formatted private key from your Auth Key
- **Where to get it:** Download when creating Auth Key in Apple Developer Portal
- **Format:** Full PEM block with line breaks
- **Example:**
```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
(multiple lines of base64)
...
-----END PRIVATE KEY-----
```
- **Important:** Keep the line breaks (`\n`) - paste exactly as downloaded

### 5. APPLE_CLIENT_ID (Optional Fallback)
- **What it is:** Same as APPLE_SERVICE_ID, used as fallback
- **Value:** `com.ghostmonday.sinapse`

## Required Other Variables

### Database
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### JWT Secret
```env
JWT_SECRET=your_random_secret_key_min_32_chars
```

### LiveKit (for video calls)
```env
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_HOST=livekit-server.ghostmonday.com
```

### Grok API (for Sin AI bot)
```env
GROK_API_KEY=your_grok_api_key
```

## Complete .env Template

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT
JWT_SECRET=your_random_secret_key_min_32_chars

# Apple Sign-In (REQUIRED)
APPLE_TEAM_ID=R7KX4HNBFY
APPLE_SERVICE_ID=com.ghostmonday.sinapse
APPLE_KEY_ID=ABC123DEF456GHI789JK
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----"
APPLE_CLIENT_ID=com.ghostmonday.sinapse

# LiveKit (for video calls)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_HOST=livekit-server.ghostmonday.com

# Grok API (for Sin AI bot)
GROK_API_KEY=your_grok_api_key

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=development
```

## Step-by-Step Setup

### Step 1: Get Apple Team ID
1. Go to https://developer.apple.com/account
2. Click "Membership" in sidebar
3. Copy your **Team ID** (10 characters)
4. Set: `APPLE_TEAM_ID=YOUR_TEAM_ID`

### Step 2: Create/Find Service ID
1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Click "+" → "Services IDs"
3. Identifier: `com.ghostmonday.sinapse`
4. Enable "Sign In with Apple"
5. Set: `APPLE_SERVICE_ID=com.ghostmonday.sinapse`

### Step 3: Create Auth Key
1. Go to https://developer.apple.com/account/resources/authkeys/list
2. Click "+" to create new key
3. Name it: "Sinapse Auth Key"
4. Enable "Sign In with Apple"
5. Click "Continue" → "Register"
6. **IMPORTANT:** Download the key file immediately (can only download once!)
7. Copy the **Key ID** (20 characters)
8. Set: `APPLE_KEY_ID=YOUR_KEY_ID`
9. Open the downloaded `.p8` file
10. Copy the entire content (including BEGIN/END lines)
11. Set: `APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"`

### Step 4: Configure Service ID
1. Go back to your Service ID (`com.ghostmonday.sinapse`)
2. Click "Configure" next to "Sign In with Apple"
3. Primary App ID: Select your app's Bundle ID
4. Return URLs: Add your callback URL (e.g., `https://yourdomain.com/auth/apple/callback`)
5. Click "Save"

## Verification

After setting all variables, test with:

```bash
# Check if Apple JWKS endpoint is accessible
curl https://appleid.apple.com/auth/keys

# Should return JSON with Apple's public keys
```

## Security Notes

- **Never commit `.env` to git** (already in `.gitignore`)
- **APPLE_PRIVATE_KEY** is sensitive - keep secure
- Use environment-specific values (dev/staging/prod)
- Rotate keys periodically
- Use secrets management in production (AWS Secrets Manager, etc.)

