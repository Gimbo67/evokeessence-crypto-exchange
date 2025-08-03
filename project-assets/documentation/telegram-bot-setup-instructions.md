# EvokeEssence Group Bot Setup Instructions

## ✅ Bot Status
Your bot **@EvokeEssenceBot** is successfully connected and working!

### Working Features:
- ✓ Bot is connected to Telegram
- ✓ Bot automatically detects when added to groups
- ✓ Bot generates unique referral codes for each group
- ✓ Your group "EvoX" has referral code: `TG-GRP-0A47A297`

## 🚀 Quick Setup Steps

### 1. Start a Conversation with Your Bot
1. Open Telegram and search for `@EvokeEssenceBot`
2. Click "Start" to begin a conversation
3. The bot will now be able to send you messages

### 2. Add the Bot to a Test Group
1. Create a new Telegram group (or use an existing one)
2. Add `@EvokeEssenceBot` to the group
3. The bot will automatically:
   - Detect it was added to the group
   - Generate a unique referral code (format: `TG-GRP-XXXXXXXX`)
   - Send a welcome message with the referral link

### 3. Available Commands (Owner Only)
Once the bot is in a group, you can use these commands:
- `/ref` - Get the group's referral link
- `/stats` - View registration and transaction statistics
- `/help` - Display help information
- `/groups` - List all active groups (in private chat with bot)
- `/reset GROUPID` - Reset a group's referral code

## 📊 How It Works

1. **Group Registration**: When the bot joins a group, it creates a unique referral code
2. **User Tracking**: Users who register at `https://evo-exchange.com/auth?ref=TG-GRP-XXXXXXXX` are linked to that group
3. **Notifications**: The group receives notifications for:
   - New user registrations
   - KYC verification updates
   - Transaction completions (SEPA, USDT, USDC)

## 🔧 Technical Details

- **Bot Token**: `7871836109:AAHu4uHUol80kN-iWzkpgdZRkMm8_ySAMx4`
- **Owner ID**: `7742418800` (@evokeessence)
- **Bot ID**: `7871836109`

## 🌐 Production Webhook Setup

For production deployment, you'll need to set up a webhook:

```bash
curl -X POST https://api.telegram.org/bot7871836109:AAHu4uHUol80kN-iWzkpgdZRkMm8_ySAMx4/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://evo-exchange.com/api/telegram/webhook/7871836109:AAHu4uHUol80kN-iWzkpgdZRkMm8_ySAMx4"}'
```

## 📝 Example Workflow

1. Bot is added to "Crypto Traders Group"
2. Bot generates referral code: `TG-GRP-ABC12345`
3. Bot sends: "Welcome! Your referral link: https://evo-exchange.com/auth?ref=TG-GRP-ABC12345"
4. User registers with that link
5. Group receives: "👤 New Registration! Username: john_doe, Email: john@example.com"
6. When user passes KYC: "✅ KYC Approved for john_doe"
7. When user makes deposit: "💰 New SEPA Deposit: 500 EUR by john_doe"

## 🔍 Testing the Integration

1. Register a test user with a group's referral code
2. Check if the group receives the registration notification
3. Update the user's KYC status (as admin/employee)
4. Create a test transaction
5. Verify all notifications are delivered to the correct group

## ⚠️ Important Notes

- Only you (owner) can use admin commands
- Each group can have only one referral code
- Notifications are sent only to the group that owns the referral code
- The bot works alongside your existing notification bots (no conflicts)

## 🆘 Troubleshooting

If notifications aren't being sent:
1. Check if the user was registered with a valid referral code
2. Verify the group is active in the database
3. Check the `telegram_notifications` table for error logs
4. Ensure the bot hasn't been removed from the group

---

Your bot is ready! Start by messaging @EvokeEssenceBot and adding it to a test group.