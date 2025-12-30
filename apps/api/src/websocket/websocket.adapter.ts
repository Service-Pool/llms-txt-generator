import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { INestApplicationContext } from '@nestjs/common';

class WebSocketAdapter extends IoAdapter {
	constructor(private app: INestApplicationContext) {
		super(app);
	}

	createIOServer(port: number, options?: ServerOptions): Server {
		const server = super.createIOServer(port, {
			...options,
			cors: {
				origin: process.env.CORS_ORIGIN,
				credentials: true
			}
		}) as Server;

		return server;
	}
}

export { WebSocketAdapter };
