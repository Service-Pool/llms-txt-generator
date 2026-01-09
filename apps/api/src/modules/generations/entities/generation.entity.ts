import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, Unique, OneToMany, ManyToOne, JoinColumn, type Relation } from 'typeorm';
import { GenerationRequest } from './generation-request.entity';
import { Calculation } from '../../calculations/entities/calculation.entity';
import { GenerationStatus } from '../../../enums/generation-status.enum';
import { Provider } from '../../../enums/provider.enum';

@Entity('generations')
@Unique('unique_generation', ['hostname', 'provider'])
class Generation {
	@PrimaryGeneratedColumn({ unsigned: true })
	public id: number;

	@Column({ type: 'varchar', length: 500 })
	@Index('idx_hostname')
	public hostname: string;

	@Column({
		type: 'enum',
		enum: Provider,
		enumName: 'provider_enum'
	})
	public provider: Provider;

	@Column({
		type: 'enum',
		enum: GenerationStatus,
		enumName: 'generation_status_enum',
		default: GenerationStatus.WAITING
	})
	public status: GenerationStatus;

	@Column({ type: 'longtext', nullable: true })
	public content: string | null;

	@Column({ type: 'text', nullable: true, name: 'error_message' })
	public errorMessage: string | null;

	@Column({ type: 'int', unsigned: true, nullable: true, name: 'entries_count' })
	public entriesCount: number | null;

	@Column({ type: 'int', unsigned: true, nullable: true, name: 'calculation_id' })
	public calculationId: number | null;

	@ManyToOne(() => Calculation, calculation => calculation.generations, { nullable: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'calculation_id' })
	public calculation: Relation<Calculation> | null;

	@OneToMany(() => GenerationRequest, request => request.generation)
	public requests: Relation<GenerationRequest[]>;

	@CreateDateColumn({ name: 'created_at' })
	public createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	public updatedAt: Date;
}

export { Generation };
