const crypto = require('crypto');
const https = require('https');

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;

function createSignature(ts, method, endpoint, body = '') {
    console.log('Signature Input:', {
        timestamp: ts,
        method,
        endpoint,
        body,
        hasSecretKey: !!SUMSUB_SECRET_KEY
    });

    const hmac = crypto.createHmac('sha256', SUMSUB_SECRET_KEY);
    const data = ts + method + endpoint + body;

    console.log('Data to sign:', data);

    hmac.update(data);
    const signature = hmac.digest('hex');

    console.log('Generated signature:', signature);
    return signature;
}

async function testSumSubAPI() {
    try {
        const url = 'https://api.sumsub.com';
        console.log('\nTesting endpoint:', url);

        const params = {
            applicantId: "test-user-id-123", // Using applicantId instead of userId
            levelName: "basic-kyc-level",
            ttlInSecs: 3600
        };

        const ts = Math.floor(Date.now() / 1000);
        const endpoint = '/resources/accessTokens';
        const body = JSON.stringify(params);

        console.log('Request parameters:', params);
        console.log('Timestamp:', ts);
        console.log('App Token:', `${SUMSUB_APP_TOKEN?.substring(0, 5)}...`);

        const signature = createSignature(ts, 'POST', endpoint, body);

        const options = {
            hostname: 'api.sumsub.com',
            path: '/resources/accessTokens',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-App-Token': SUMSUB_APP_TOKEN,
                'X-App-Access-Ts': ts.toString(),
                'X-App-Access-Sig': signature
            }
        };

        console.log('Request headers:', {
            ...options.headers,
            'X-App-Token': '[HIDDEN]'
        });

        await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    console.log('Response status:', res.statusCode);
                    try {
                        const jsonData = JSON.parse(data);
                        console.log('Response data:', jsonData);
                        resolve(jsonData);
                    } catch (error) {
                        console.error('Failed to parse response:', data);
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('Request failed:', error);
                reject(error);
            });

            req.write(body);
            req.end();
        });

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
console.log('Starting SumSub API test...');
testSumSubAPI();