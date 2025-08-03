import { Router, Request, Response } from 'express';
import { TelegramWebhookService } from '../services/telegram-webhook.js';

const router = Router();

/**
 * Serve the webhook setup page
 */
router.get('/setup-webhook', (req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>EvokeEssence Bot - 24/7 Setup</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px; 
            background: #f8fafc;
        }
        .container { 
            background: white; 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        }
        h1 { color: #1e293b; margin-bottom: 30px; }
        button { 
            background: #3b82f6; 
            color: white; 
            padding: 16px 32px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 16px; 
            font-weight: 600;
            transition: all 0.2s;
        }
        button:hover { background: #2563eb; transform: translateY(-1px); }
        button:disabled { background: #94a3b8; cursor: not-allowed; transform: none; }
        #result { margin-top: 25px; padding: 20px; border-radius: 8px; }
        .success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .info { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .status-item { 
            display: flex; 
            align-items: center; 
            padding: 8px 0; 
            border-bottom: 1px solid #e2e8f0;
        }
        .status-item:last-child { border-bottom: none; }
        .status-icon { margin-right: 12px; font-size: 18px; }
        ol { margin: 20px 0; }
        li { margin: 8px 0; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 EvokeEssence Bot - Enable 24/7 Operation</h1>
        
        <div class="info">
            <h3 style="margin-top: 0;">Current Status Check:</h3>
            <div class="status-item">
                <span class="status-icon">✅</span>
                <span>Bot code deployed to production</span>
            </div>
            <div class="status-item">
                <span class="status-icon">⏳</span>
                <span>Currently using polling mode (only works while Replit is active)</span>
            </div>
            <div class="status-item">
                <span class="status-icon">🎯</span>
                <span>Need to enable webhooks for 24/7 operation</span>
            </div>
        </div>

        <h3>Enable 24/7 Bot Operation</h3>
        <p>Click this button to switch from polling to webhooks and enable continuous operation:</p>
        <button id="setupBtn" onclick="enableWebhook()">🚀 Enable 24/7 Operation</button>
        
        <div id="result"></div>

        <h3>Testing Instructions</h3>
        <ol>
            <li><strong>Current test:</strong> Bot responds while Replit is running</li>
            <li><strong>Click the button above</strong> to enable webhooks</li>
            <li><strong>Close Replit completely</strong> and wait 2 minutes</li>
            <li><strong>Send /help to @EvokeEssenceBot</strong> - should still respond!</li>
            <li><strong>Success:</strong> Bot now runs 24/7 on Cloudflare infrastructure</li>
        </ol>

        <div style="margin-top: 30px; padding: 20px; background: #f1f5f9; border-radius: 8px;">
            <h4 style="margin-top: 0;">How This Works:</h4>
            <p><strong>Before:</strong> Bot uses polling (checks for messages every few seconds, stops when Replit closes)</p>
            <p><strong>After:</strong> Bot uses webhooks (Telegram sends messages directly to your Cloudflare server, works 24/7)</p>
        </div>
    </div>

    <script>
        let webhookEnabled = false;

        async function enableWebhook() {
            const button = document.getElementById('setupBtn');
            const result = document.getElementById('result');
            
            button.disabled = true;
            button.innerHTML = '⏳ Setting up webhook...';
            
            try {
                // First check current webhook status
                console.log('Checking current webhook status...');
                
                const response = await fetch('/api/webhook/telegram/set', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        webhookUrl: 'https://evo-exchange.com/api/webhook/telegram'
                    })
                });
                
                const data = await response.json();
                console.log('Webhook response:', data);
                
                if (data.success || response.ok) {
                    result.className = 'success';
                    result.innerHTML = \`
                        <h4>🎉 Success! Bot is now running 24/7!</h4>
                        <div style="margin: 15px 0;">
                            <strong>Webhook URL:</strong> https://evo-exchange.com/api/webhook/telegram<br>
                            <strong>Status:</strong> Active and receiving updates
                        </div>
                        <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
                            <h5 style="margin: 0 0 10px 0;">🧪 Test Instructions:</h5>
                            <ol style="margin: 0; padding-left: 20px;">
                                <li>Close this Replit tab completely</li>
                                <li>Wait 2-3 minutes</li>
                                <li>Send <code>/help</code> to @EvokeEssenceBot</li>
                                <li>Bot should respond instantly! 🎯</li>
                            </ol>
                        </div>
                        <p style="color: #059669; font-weight: 600;">Your bot now runs independently on Cloudflare's global network!</p>
                    \`;
                    button.innerHTML = '✅ 24/7 Operation Enabled';
                    button.style.background = '#10b981';
                    webhookEnabled = true;
                } else {
                    throw new Error(data.error || 'Failed to enable webhook');
                }
                
            } catch (error) {
                console.error('Webhook setup error:', error);
                result.className = 'error';
                result.innerHTML = \`
                    <h4>❌ Setup Error</h4>
                    <p><strong>Error:</strong> \${error.message}</p>
                    <p>The bot is still in polling mode (only works while Replit is active).</p>
                    <div style="margin-top: 15px; padding: 15px; background: #fef3c7; border-radius: 6px;">
                        <strong>Troubleshooting:</strong>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>Make sure your bot endpoints are deployed to production</li>
                            <li>Check that the webhook route is accessible</li>
                            <li>Try refreshing the page and clicking again</li>
                        </ul>
                    </div>
                \`;
                button.disabled = false;
                button.innerHTML = '🔄 Try Again';
            }
        }
        
        // Check webhook status on page load
        window.onload = async function() {
            try {
                const response = await fetch('/api/webhook/telegram/info');
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.result && data.result.url && data.result.url.includes('evo-exchange.com')) {
                        const result = document.getElementById('result');
                        const button = document.getElementById('setupBtn');
                        
                        result.className = 'success';
                        result.innerHTML = \`
                            <h4>✅ Webhook Already Configured!</h4>
                            <p><strong>Active webhook:</strong> \${data.result.url}</p>
                            <p><strong>Status:</strong> Bot is running 24/7 on Cloudflare</p>
                            <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
                                <strong>🧪 Test:</strong> Close Replit completely and send /help to @EvokeEssenceBot<br>
                                <strong>Expected:</strong> Bot responds instantly (24/7 operation confirmed!)
                            </div>
                        \`;
                        button.innerHTML = '✅ 24/7 Operation Active';
                        button.disabled = true;
                        button.style.background = '#10b981';
                        webhookEnabled = true;
                    }
                }
            } catch (error) {
                console.log('Webhook not yet configured, ready for setup');
            }
        };
    </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;