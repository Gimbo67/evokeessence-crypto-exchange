# Telegram Group Bot Integration

## Overview

This implementation adds a sophisticated Telegram bot system that tracks user activities based on referral codes and posts notifications to specific Telegram groups. Each group receives its own unique referral code, and all user activities (registrations, KYC verifications, transactions) are tracked and reported to the group that owns the referral code.

## Features

### 1. Automatic Group Registration
- When the bot is added to a Telegram group, it automatically:
  - Detects the group ID
  - Generates a unique referral code (format: `TG-GRP-XXXXXXXX`)
  - Stores the group information in the database
  - Sends a welcome message with the referral link

### 2. Referral Tracking
- Each group has one unique referral code
- Registration link format: `https://evo-exchange.com/auth?ref=UNIQUECODE`
- Users who register with a group's referral code are tracked
- All subsequent activities are reported to that group

### 3. Activity Notifications
The bot sends notifications to groups for:
- **New Registrations**: When someone registers using the group's referral code
- **KYC Status Updates**: When a user passes or fails KYC verification
- **Transactions**: When users complete or fail transactions (SEPA, USDT, USDC)

### 4. Admin Commands
Only the bot owner can use these commands:
- `/ref` - Resend the group's referral link
- `/stats` - Show registration and transaction statistics
- `/help` - Display help information
- `/groups` - List all active groups
- `/reset GROUPID` - Reset a group's referral code

## Setup Instructions

### 1. Create a Telegram Bot
1. Open Telegram and search for @BotFather
2. Send `/newbot` and follow the instructions
3. Save the bot token you receive

### 2. Get Your Telegram User ID
1. Search for @userinfobot on Telegram
2. Send any message to it
3. It will reply with your user ID

### 3. Configure Environment Variables
Create or update your `.env` file with:
```env
TELEGRAM_GROUP_BOT_TOKEN=your_bot_token_here
TELEGRAM_OWNER_ID=your_telegram_user_id
TELEGRAM_OWNER_USERNAME=your_telegram_username
```

### 4. Set Up Webhook (Production)
For production, you need to set up a webhook so Telegram can send updates to your server:
```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook/<YOUR_BOT_TOKEN>"}'
```

### 5. Database Migration
The required database tables are automatically created:
- `telegram_groups` - Stores group information and referral codes
- `telegram_notifications` - Logs all sent notifications

## Testing

### Test Bot Connection
```bash
curl http://localhost:5000/api/telegram/test
```

### Test Notifications
The system automatically sends notifications when:
1. A user registers with a referral code
2. KYC status is updated by employees
3. SEPA deposits are created
4. Crypto transactions are processed

## Integration Points

### Registration (auth.routes.ts)
When a user registers with a referral code, the system:
1. Validates the referral code
2. Links the user to the referring group
3. Sends a notification to the group

### KYC Updates (employee-client.routes.ts)
When an employee updates KYC status:
1. Updates the database
2. Sends notification to the group that referred the user

### Transactions (deposits.ts, usdt.routes.ts, usdc.routes.ts)
When transactions are created:
1. Processes the transaction
2. Sends notification to the referring group

## API Endpoints

### Webhook Endpoint
`POST /api/telegram/webhook/:token`
- Receives updates from Telegram
- Validates the bot token
- Processes commands and group joins

### Internal Notification Endpoints
These are called internally by the system:

`POST /api/telegram/internal/notify/registration`
- Notifies groups about new registrations
- Requires: `userId`

`POST /api/telegram/internal/notify/kyc`
- Notifies groups about KYC status changes
- Requires: `userId`, `status`

`POST /api/telegram/internal/notify/transaction`
- Notifies groups about transactions
- Requires: `userId`, `type`, `amount`, `currency`, `status`, `reference`

### Admin Endpoints
`GET /api/telegram/groups`
- Lists all active groups with statistics
- Requires admin authentication

## Security Considerations

1. **Token Validation**: The webhook endpoint validates the bot token
2. **Owner-Only Commands**: Commands are restricted to the configured owner ID
3. **Internal APIs**: Notification endpoints are internal-only
4. **Group Isolation**: Each group only receives notifications for their referrals

## Backward Compatibility

The new system works alongside the existing two-bot system:
- Registration Bot: Still receives all registration and KYC notifications
- Transaction Bot: Still receives all transaction notifications
- Group Bot: Additionally sends targeted notifications to specific groups

## Troubleshooting

### Bot Not Responding to Commands
1. Check if the bot token is correctly configured
2. Verify the owner ID is set correctly
3. Ensure the bot has been added to the group

### Notifications Not Being Sent
1. Check if the user was registered with a valid referral code
2. Verify the group is active in the database
3. Check the telegram_notifications table for error messages

### Webhook Not Working
1. Ensure your server is accessible from the internet
2. Verify the webhook URL is correctly set
3. Check server logs for incoming webhook requests

## Future Enhancements

Potential improvements:
1. Multi-language support for bot messages
2. Customizable notification templates per group
3. Transaction volume tracking and commission calculations
4. Automated commission payouts
5. Group-specific statistics dashboards