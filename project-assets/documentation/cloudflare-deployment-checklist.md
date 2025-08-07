# 🚀 Ready to Deploy! Complete Cloudflare Setup

Your code is ready for 24/7 deployment. Here's your step-by-step guide:

## ✅ Current Status
- Webhook endpoints are active
- Bot is working in development
- Build configuration is ready
- All necessary code is in place

---

## 🎯 STEP 1: Go to Cloudflare Pages

1. **Login to your Cloudflare account**
2. **Navigate to Pages** in the left sidebar
3. **Click "Create a project"**
4. **Select "Connect to Git"**

---

## 🔗 STEP 2: Connect Your Repository

If you already have this project on GitHub:
- Select your repository from the list
- Choose the `main` branch

If you DON'T have it on GitHub yet:
1. Go to GitHub.com
2. Create a new repository (name it `evokeessence-bot` or similar)
3. **Don't initialize with README** (since you have existing code)
4. Copy the repository URL
5. In Replit, open the Shell and run:
   ```bash
   git remote add origin YOUR_GITHUB_REPO_URL
   git add .
   git commit -m "Deploy bot for 24/7 operation"
   git push -u origin main
   ```
6. Go back to Cloudflare Pages and select your new repository

---

## ⚙️ STEP 3: Configure Build Settings

**Project name**: `evokeessence-bot` (or your choice)
**Production branch**: `main`
**Framework preset**: `None`
**Build command**: `npm install && npm run build`
**Build output directory**: `dist`

---

## 🔐 STEP 4: Add Environment Variables

In the Environment Variables section, add these **exactly**:

**Essential Bot Variables:**
```
NODE_ENV = production
TELEGRAM_OWNER_ID = 7742418800
```

**Database & Other Variables:**
You'll need to add your current environment variables. Common ones include:
```
DATABASE_URL = [your_database_url]
TELEGRAM_BOT_TOKEN = [for dual bot system]
TELEGRAM_TRANSACTION_BOT_TOKEN = [for dual bot system]
```

**To find your current variables:**
- Check your Replit's Secrets tab
- Or check any `.env` files you might have

---

## 🚀 STEP 5: Deploy

1. **Click "Save and Deploy"**
2. **Wait for deployment** (usually 2-5 minutes)
3. **You'll get a URL** like: `https://evokeessence-bot-xxx.pages.dev`

---

## 🔄 STEP 6: Switch to Webhooks (Critical!)

After deployment succeeds, you MUST set up webhooks:

**Replace `YOUR_DOMAIN` with your actual Cloudflare URL:**

```bash
# Set the webhook
curl -X POST https://YOUR_DOMAIN.pages.dev/api/webhook/telegram/set \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://YOUR_DOMAIN.pages.dev/api/webhook/telegram"}'
```

**Expected response:**
```json
{"success":true,"message":"Webhook set successfully"}
```

---

## ✅ STEP 7: Test 24/7 Operation

1. **Test bot commands** in Telegram - should respond instantly
2. **Close Replit completely**
3. **Wait 5 minutes**
4. **Send bot commands again** - should still work!

---

## 📊 Verification Commands

After deployment, use these to verify everything works:

```bash
# Check health
curl https://YOUR_DOMAIN.pages.dev/health

# Check webhook status
curl https://YOUR_DOMAIN.pages.dev/api/webhook/telegram/info

# Check bot health
curl https://YOUR_DOMAIN.pages.dev/api/telegram/health
```

---

## 🆘 If Something Goes Wrong

**If deployment fails:**
- Check Cloudflare build logs
- Verify all environment variables are set
- Make sure your database URL is accessible from Cloudflare

**If bot doesn't respond:**
```bash
# Remove webhook (temporary fix)
curl -X DELETE https://YOUR_DOMAIN.pages.dev/api/webhook/telegram

# Check what's wrong, then set webhook again
```

---

## Ready to Start?

**Tell me when you're ready and I'll help you with each step!**

Your bot will then run 24/7 on Cloudflare's global network, responding to messages even when you're offline or Replit is inactive.