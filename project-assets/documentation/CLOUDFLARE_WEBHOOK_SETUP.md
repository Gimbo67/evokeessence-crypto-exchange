# Cloudflare Webhook Configuration Guide

## Step-by-Step Cloudflare Setup

### 1. Access Cloudflare Dashboard
1. Go to [cloudflare.com](https://cloudflare.com) and log in
2. Select your domain (`evo-exchange.com`)
3. Go to **Security** → **WAF** (Web Application Firewall)

### 2. Create Webhook Exception Rule
1. Click **"Create rule"** in Custom Rules section
2. **Rule name**: `Telegram Webhook Bypass`
3. **Expression**: 
   ```
   (http.request.uri.path eq "/api/webhook/telegram")
   ```
4. **Action**: Select **"Skip"**
5. **Skip options**: Check all security features:
   - Skip Browser Integrity Check
   - Skip Hotlink Protection  
   - Skip Security Level
   - Skip Rate Limiting
   - Skip WAF

### 3. Alternative: IP Whitelist Method
If the above doesn't work, whitelist Telegram's IPs:
1. **Security** → **WAF** → **Tools**
2. **IP Access Rules** → **Add rule**
3. **Value**: `149.154.160.0/20` (Telegram IP range)
4. **Action**: **Allow**
5. **Zone**: Select your domain
6. Repeat for: `91.108.4.0/22`

### 4. Enable Webhook in Code
After Cloudflare is configured:
```javascript
// In server/services/telegram-group-bot.ts, change line 88:
const isProduction = true; // Enable webhook mode
```

### 5. Deploy and Test
1. Deploy your Replit project
2. Bot will automatically detect production and set webhook
3. Test with: Send `/help` to @EvokeEssenceBot
4. Bot should respond instantly even with Replit closed

## Verification Commands
```bash
# Check webhook status

# Test webhook endpoint
curl -X POST "https://evo-exchange.com/api/webhook/telegram" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Expected results:
- Webhook status shows your URL with 0 pending updates
- Endpoint test returns `{"ok":true,"message":"No valid update"}`