# Complete Cloudflare Setup for 24/7 Telegram Bot

## Current Status ✅
Your bot is now ready for Cloudflare deployment with:
- ✅ Webhook support added
- ✅ Keep-alive mechanisms for development
- ✅ Health monitoring endpoints
- ✅ Production-ready reliability improvements

## Step 1: Test Webhook Locally (Optional)

Before deploying to Cloudflare, you can test the webhook functionality:

```bash
# Get current webhook info
curl http://localhost:5000/api/webhook/telegram/info

# Test webhook endpoint (simulate Telegram sending update)
curl -X POST http://localhost:5000/api/webhook/telegram \
  -H "Content-Type: application/json" \
  -d '{"update_id":1,"message":{"message_id":1,"from":{"id":123,"first_name":"Test"},"chat":{"id":-123,"type":"group"},"text":"Hello"}}'
```

## Step 2: Deploy to Cloudflare

### Option A: Using Cloudflare Pages (Recommended)

1. **Push to GitHub** (if not already done):
```bash
git add .
git commit -m "Add webhook support for Cloudflare"
git push origin main
```

2. **Connect to Cloudflare Pages**:
   - Go to Cloudflare Dashboard → Pages
   - "Create a project" → "Connect to Git"
   - Select your repository
   - Configure build settings:
     - **Framework preset**: None
     - **Build command**: `npm run build` (or leave empty for Node.js)
     - **Build output directory**: `dist` (or leave empty for Node.js)

3. **Add Environment Variables**:
   In Cloudflare Pages settings → Environment variables, add:
   ```
   DATABASE_URL=your_database_url
   TELEGRAM_OWNER_ID=7742418800
   NODE_ENV=production
   ```

### Option B: Using Cloudflare Workers

1. **Install Wrangler**:
```bash
npm install -g wrangler
wrangler login
```

2. **Create wrangler.toml**:
```toml
name = "evokeessence-bot"
main = "server/index.ts"
compatibility_date = "2025-01-01"

[vars]
NODE_ENV = "production"

[secrets]
DATABASE_URL = "your_database_url"
TELEGRAM_GROUP_BOT_TOKEN = "your_bot_token"
TELEGRAM_OWNER_ID = "your_telegram_id"
```

3. **Deploy**:
```bash
wrangler publish
```

## Step 3: Set Webhook URL

After deployment, set your webhook URL:

```bash
# Replace YOUR_DOMAIN with your actual Cloudflare domain
curl -X POST https://YOUR_DOMAIN.pages.dev/api/webhook/telegram/set \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://YOUR_DOMAIN.pages.dev/api/webhook/telegram"}'
```

## Step 4: Verify Deployment

1. **Check webhook status**:
```bash
curl https://YOUR_DOMAIN.pages.dev/api/webhook/telegram/info
```

2. **Check health**:
```bash
curl https://YOUR_DOMAIN.pages.dev/health
```

3. **Test bot**: Send a message to your bot - it should respond even without you being online

## Step 5: Switch from Polling to Webhooks

Your bot is currently using polling (checking for updates every few seconds). Once deployed to Cloudflare with webhooks:

1. **Webhooks are more efficient** - Telegram sends updates directly to your endpoint
2. **Better for serverless** - No continuous polling process needed
3. **Instant response** - No delay waiting for next poll

## Comparison: Current vs Cloudflare

| Feature | Current (Replit) | Cloudflare |
|---------|------------------|------------|
| **Uptime** | While app is active | 24/7 |
| **Cost** | Free (with limitations) | Free tier available |
| **Performance** | Good | Excellent (global edge) |
| **Scaling** | Limited | Automatic |
| **Method** | Polling | Webhooks |

## Troubleshooting

### If webhook isn't working:
```bash
# Check webhook info
curl https://YOUR_DOMAIN.pages.dev/api/webhook/telegram/info

# Remove webhook (go back to polling)
curl -X DELETE https://YOUR_DOMAIN.pages.dev/api/webhook/telegram
```

### If deployment fails:
1. Check Cloudflare build logs
2. Verify all environment variables are set
3. Ensure your database is accessible from Cloudflare

## Your Current URLs
Once deployed, your bot will be available at:
- **Main app**: `https://your-domain.pages.dev`
- **Webhook endpoint**: `https://your-domain.pages.dev/api/webhook/telegram`
- **Health check**: `https://your-domain.pages.dev/health`
- **Bot health**: `https://your-domain.pages.dev/api/telegram/health`

The bot will run 24/7 on Cloudflare's global network, responding instantly to Telegram messages even when you're offline!