import WebSocket from 'ws';
import fs from 'fs';

// Read token from file
const token = fs.readFileSync('websocket_token.txt', 'utf8').trim();

console.log('Connecting with token:', token);
const ws = new WebSocket(`ws://localhost:5000/ws?token=${token}`);

ws.on('open', function open() {
  console.log('WebSocket connection opened');
  
  // Send a ping message
  ws.send(JSON.stringify({
    type: 'ping',
    timestamp: new Date().toISOString()
  }));
  
  console.log('WebSocket client is now listening for events...');
  console.log('Keep this terminal open and send notifications from another terminal');
});

ws.on('message', function incoming(data) {
  const message = JSON.parse(data);
  console.log('\n---------- EVENT RECEIVED ----------');
  console.log('Event type:', message.type);
  console.log('Event data:', JSON.stringify(message, null, 2));
  console.log('------------------------------------\n');
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('WebSocket connection closed');
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Closing WebSocket connection...');
  ws.close();
  process.exit(0);
});