import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('content_store')
class ContentStore {
	@PrimaryColumn()
	contentHash: string;

	@Column({ type: 'longtext' })
	rawContent: string;

	@Column({ default: 0 })
	refCount: number;

	@CreateDateColumn()
	firstSeenAt: Date;

	@Column({ type: 'datetime', utc: true })
	lastAccessedAt: Date;
}

export { ContentStore };
