#!/bin/bash

# Test Production Endpoints for evo-exchange.com
echo "🔍 Testing production endpoints for 24/7 bot deployment..."
echo

# Test main health endpoint
echo "1. Testing main website health:"
curl -s https://evo-exchange.com/health | head -5
echo
echo

# Test if webhook endpoints are available
echo "2. Testing webhook endpoint availability:"
curl -s https://evo-exchange.com/api/webhook/telegram/info | head -5
echo
echo

# Test bot health endpoint
echo "3. Testing bot health endpoint:"
curl -s https://evo-exchange.com/api/telegram/health | head -5
echo
echo

echo "✅ If all endpoints respond, your bot is ready for 24/7 operation!"
echo "Next step: Set webhook URL to https://evo-exchange.com/api/webhook/telegram"