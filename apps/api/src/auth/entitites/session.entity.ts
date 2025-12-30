import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { type Session as FastifySession } from 'fastify';

// Extend Fastify Session with custom fields
declare module 'fastify' {
	interface Session {
		userId?: number;
	}
}

@Entity('sessions')
class Session {
	@PrimaryColumn({ type: 'varchar', length: 128 })
	sid: string;

	@Column({ type: 'json' })
	sess: FastifySession;

	@Column({ type: 'timestamp' })
	@Index()
	expire: Date;
}

export { Session };
