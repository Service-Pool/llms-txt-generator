import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('sessions')
export class Session {
	@PrimaryColumn({ type: 'varchar', length: 128 })
	sid: string;

	@Column({ type: 'text' })
	sess: string;

	@Column({ type: 'timestamp' })
	@Index()
	expire: Date;
}
