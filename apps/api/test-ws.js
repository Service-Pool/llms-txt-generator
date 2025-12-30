const WebSocket = require('ws');

// Replace with actual session cookie value
const sessionCookie = 'llmstxt.sid=a9l9JduJ7VyscGaRQAo56DjNCMvHZtI3.a%2BX62YZnDNlOufUPGnunXeykvuQGsR8CzY3gEPqfdds';

const ws = new WebSocket('ws://localhost:4200/ws', {
	headers: {
		'Cookie': sessionCookie
	}
});

ws.on('open', function open() {
	console.log('✅ WebSocket connected');

	// Subscribe to a generation
	ws.send(JSON.stringify({
		type: 'subscribe',
		payload: { generationIds: [1] }
	}));
	console.log('📤 Sent subscribe message');
});

ws.on('message', function message(data) {
	console.log('📨 Received:', data.toString());
});

ws.on('error', function error(err) {
	console.error('❌ WebSocket error:', err);
});

ws.on('close', function close() {
	console.log('❌ WebSocket connection closed');
});

// Keep script running for 30 seconds
setTimeout(() => {
	console.log('⏱️  Timeout - closing connection');
	ws.close();
	process.exit(0);
}, 30000);
