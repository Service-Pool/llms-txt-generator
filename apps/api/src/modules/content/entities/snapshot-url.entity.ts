import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('snapshot_urls')
@Index(['url', 'contentHash'], { unique: true })
class SnapshotUrl {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 512 })
	url: string;

	@Column()
	title: string;

	@Column({ length: 64 })
	contentHash: string;

	@CreateDateColumn({ utc: true })
	createdAt: Date;
}

export { SnapshotUrl };
