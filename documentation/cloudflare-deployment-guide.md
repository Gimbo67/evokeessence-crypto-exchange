# Deploy Telegram Bot to Cloudflare for 24/7 Operation

## Overview
You can deploy your EvokeEssence Telegram bot to Cloudflare Workers/Pages for continuous operation while keeping Replit for development.

## Option 1: Cloudflare Workers (Recommended for Bots)

### Benefits
- **Free tier**: 100,000 requests/day
- **24/7 operation**: No sleeping, always active
- **Global edge**: Fast response times worldwide
- **Serverless**: Automatic scaling
- **Cost**: Free for most bot usage

### Setup Steps

1. **Install Wrangler CLI** (Cloudflare's deployment tool):
```bash
npm install -g wrangler
```

2. **Login to Cloudflare**:
```bash
wrangler login
```

3. **Create wrangler.toml** in your project root:
```toml
name = "evokeessence-telegram-bot"
main = "worker.js"
compatibility_date = "2025-01-01"

[vars]
NODE_ENV = "production"

[[kv_namespaces]]
binding = "BOT_DATA"
id = "your-kv-namespace-id"
```

4. **Create worker.js** (Cloudflare Workers entry point):
```javascript
// This will be your main worker file
import { telegramGroupBot } from './server/services/telegram-group-bot.js';

export default {
  async fetch(request, env, ctx) {
    // Handle Telegram webhook
    if (request.method === 'POST' && request.url.includes('/webhook/telegram')) {
      const update = await request.json();
      await telegramGroupBot.handleUpdate(update);
      return new Response('OK');
    }
    
    // Health check
    if (request.url.includes('/health')) {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        bot: 'active'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('EvokeEssence Bot Active');
  }
};
```

## Option 2: Cloudflare Pages (Full App Deployment)

### Benefits
- **Full-stack deployment**: Frontend + backend
- **Free tier**: Generous limits
- **Git integration**: Auto-deploy from GitHub
- **Custom domains**: Use your domain

### Setup Steps

1. **Push to GitHub** (if not already):
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-github-repo
git push -u origin main
```

2. **Connect to Cloudflare Pages**:
   - Go to Cloudflare Dashboard → Pages
   - Connect to GitHub repository
   - Configure build settings:
     - **Build command**: `npm run build`
     - **Output directory**: `dist`

3. **Add Environment Variables**:
   - Database URL
   - Telegram bot tokens
   - All your current environment variables

## Database Considerations

### Option A: Keep PostgreSQL (Current Setup)
- Use your existing database connection
- Add database URL to Cloudflare environment variables
- May have connection limits from serverless environment

### Option B: Cloudflare D1 (SQLite)
- Native Cloudflare database
- Better integration with Workers
- Would require database migration

## Environment Variables Setup

In Cloudflare Dashboard:
1. **Go to Workers & Pages** → Your project
2. **Settings** → **Environment Variables**
3. **Add all your current variables**:
   - `DATABASE_URL`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_TRANSACTION_BOT_TOKEN`
   - All other secrets

## Webhook vs Polling

For Cloudflare deployment, **webhooks are better than polling**:

### Current (Polling):
- Bot continuously asks Telegram for updates
- Works in development
- Uses more resources

### Recommended (Webhooks):
- Telegram sends updates directly to your endpoint
- More efficient for production
- Perfect for serverless

## Migration Steps

1. **Test locally** with webhook mode
2. **Deploy to Cloudflare**
3. **Set webhook URL**: `https://your-domain.com/webhook/telegram`
4. **Update bot configuration** to use webhooks instead of polling

## Cost Estimation

**Cloudflare Workers Free Tier**:
- 100,000 requests/day
- 10ms CPU time per request
- Should handle most Telegram bot traffic for free

**If you exceed free tier**:
- $5/month for Workers Paid plan
- 10 million requests/month included

Would you like me to help you set up the Cloudflare deployment? I can modify your bot code to work with webhooks and create the necessary configuration files.