#!/bin/bash

echo "🔍 Testing Bot 24/7 Operation - Step by Step"
echo "=============================================="
echo

# Step 1: Test bot in current development mode
echo "1. Testing bot in development (polling mode):"
echo "   Send /help to your bot @EvokeEssenceBot"
echo "   Expected: Bot responds while Replit is running"
echo

# Step 2: Close Replit and test
echo "2. TEST: Close Replit development and test bot"
echo "   Instructions:"
echo "   - Close this Replit tab completely"  
echo "   - Wait 2 minutes"
echo "   - Send /help to @EvokeEssenceBot"
echo "   - Expected: Bot DOES NOT respond (because polling stops)"
echo

# Step 3: Set webhook manually via browser
echo "3. Set webhook via browser (bypass Cloudflare security):"
echo "   Open in browser: https://evo-exchange.com/api/webhook/telegram/set"
echo "   POST request with: {\"webhookUrl\": \"https://evo-exchange.com/api/webhook/telegram\"}"
echo

# Step 4: Test after webhook
echo "4. Final test after webhook is set:"
echo "   - Close Replit completely"
echo "   - Send /help to @EvokeEssenceBot"  
echo "   - Expected: Bot RESPONDS (24/7 operation working!)"
echo

echo "=============================================="
echo "Ready for testing? Let's start with step 1!"