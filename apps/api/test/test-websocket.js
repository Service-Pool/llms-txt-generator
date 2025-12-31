const WebSocket = require('ws');
const http = require('http');

const WS_URL = 'ws://localhost:4200/ws';
const API_URL = 'http://localhost:4200/api/generations';
const SESSION_COOKIE = 'llmstxt.sid=a9l9JduJ7VyscGaRQAo56DjNCMvHZtI3.a%2BX62YZnDNlOufUPGnunXeykvuQGsR8CzY3gEPqfdds';

let receivedProgress = false;
let receivedCompletion = false;

console.log('🧪 WebSocket Functional Test\n');

// Create generation via HTTP
function createGeneration() {
	return new Promise((resolve, reject) => {
		const postData = JSON.stringify({
			hostname: 'https://opencut.app',
			provider: 'ollama'
		});

		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(postData),
				'Cookie': SESSION_COOKIE
			}
		};

		console.log('📤 Creating generation...');
		console.log(`   Hostname: https://opencut.app`);
		console.log(`   Provider: ollama\n`);

		const req = http.request(API_URL, options, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				if (res.statusCode === 202) {
					const response = JSON.parse(data);
					const generationId = response.message.id;
					console.log(`✅ Generation created: ID=${generationId}\n`);
					resolve(generationId);
				} else {
					console.error(`❌ HTTP ${res.statusCode}:`, data);
					reject(new Error(`Failed to create generation: ${res.statusCode}`));
				}
			});
		});

		req.on('error', (error) => {
			console.error('❌ HTTP error:', error.message);
			reject(error);
		});

		req.write(postData);
		req.end();
	});
}

// Start test
async function runTest() {
	try {
		// 1. Create generation
		const generationId = await createGeneration();

		// 2. Connect WebSocket
		console.log('🔌 Connecting to WebSocket...');
		const ws = new WebSocket(WS_URL, {
			headers: { Cookie: SESSION_COOKIE }
		});

		ws.on('open', () => {
			console.log('✅ WebSocket connected\n');

			// 3. Subscribe to generation
			console.log(`📡 Subscribing to generation ${generationId}...`);
			ws.send(JSON.stringify({
				type: 'subscribe',
				payload: { generationIds: [generationId] }
			}));
			console.log('✅ Subscribed\n');
			console.log('👂 Listening for events...\n');
		});

		ws.on('message', (data) => {
			const message = JSON.parse(data.toString());

			if (message.type === 'generation:progress') {
				receivedProgress = true;
				const { processedUrls, totalUrls, status } = message.payload;
				console.log(`📊 Progress: ${processedUrls}/${totalUrls} URLs processed (${status})`);
			} else if (message.type === 'generation:status') {
				receivedCompletion = true;
				const { status, entriesCount, errorMessage } = message.payload;
				console.log(`\n🎯 Final status: ${status}`);

				if (status === 'COMPLETED') {
					console.log(`✅ Success! Entries: ${entriesCount}`);
					console.log(`\n✅ Test PASSED - All events received`);
					console.log(`   - Progress events: ${receivedProgress ? '✅' : '❌'}`);
					console.log(`   - Completion event: ${receivedCompletion ? '✅' : '❌'}`);
				} else if (status === 'FAILED') {
					console.log(`❌ Failed: ${errorMessage}`);
					console.log(`\n❌ Test FAILED - Generation failed`);
				}

				setTimeout(() => {
					ws.close();
				}, 1000);
			} else {
				console.log('📨 Unknown event:');
				console.log(JSON.stringify(message, null, 2));
			}
		});

		ws.on('error', (error) => {
			console.error('❌ WebSocket error:', error.message);
			process.exit(1);
		});

		ws.on('close', () => {
			console.log('\n🔌 WebSocket disconnected');
			process.exit(receivedCompletion ? 0 : 1);
		});

		// Timeout after 60 seconds
		setTimeout(() => {
			console.log('\n❌ Test TIMEOUT - No completion event received after 60 seconds');
			console.log(`   - Progress events: ${receivedProgress ? '✅' : '❌'}`);
			console.log(`   - Completion event: ${receivedCompletion ? '✅' : '❌'}`);
			ws.close();
			process.exit(1);
		}, 60000);
	} catch (error) {
		console.error('❌ Test failed:', error.message);
		process.exit(1);
	}
}

runTest();
