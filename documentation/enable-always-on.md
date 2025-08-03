# 🚀 Enable Replit Always On for 24/7 Bot Operation

## What is Always On?

Replit Always On is a premium feature that keeps your app running 24/7, even when you close the browser tab. This is exactly what you need for true bot operation.

## How to Enable Always On

1. **Go to your Replit project settings**
2. **Find "Always On" option** in the sidebar or deployment section
3. **Enable Always On** (requires Replit Pro subscription)
4. **Your bot will automatically switch to webhook mode**

## What Happens When Always On is Enabled

Once Always On is active:
- ✅ Your app runs 24/7 continuously
- ✅ Bot automatically detects this and switches to webhook mode
- ✅ True 24/7 operation without any manual setup
- ✅ Works even when you close Replit

## Alternative: Manual Webhook Activation

If you can't enable Always On right now, you can activate webhook mode manually:

```bash
curl -X POST "https://api.telegram.org/bot7871836109:AAHu4uHUol80kN-iWzkpgdZRkMm8_ySAMx4/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://evo-exchange.com/api/webhook/telegram", "allowed_updates": ["message", "my_chat_member"]}'
```

## Check Your Current Status

Run this command to see if Always On is detected:
```bash
env | grep -i always
```

## Benefits of Always On + Webhook

- 🔥 True 24/7 operation
- 🚀 No dependence on browser being open
- ⚡ Instant response to Telegram messages
- 💪 Production-grade reliability
- 🌐 Uses Cloudflare infrastructure

## Next Steps

1. Enable Always On in Replit settings
2. Bot will automatically detect and switch to webhook
3. Enjoy true 24/7 bot operation!

Your infrastructure is ready - just need Always On activation!