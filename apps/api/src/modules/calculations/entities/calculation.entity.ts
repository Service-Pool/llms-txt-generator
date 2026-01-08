import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, OneToMany, type Relation } from 'typeorm';
import { Generation } from '../../generations/entities/generation.entity';
import { Currency, CURRENCY_SYMBOLS } from '../../../enums/currency.enum';
import { Provider } from '../../../enums/provider.enum';
import { ProviderPrices, PriceModel } from '../models/provider-prices.model';

@Entity('calculations')
class Calculation {
	@PrimaryGeneratedColumn({ unsigned: true })
	public id: number;

	@Column({ type: 'varchar', length: 500, unique: true })
	@Index('idx_hostname', { unique: true })
	public hostname: string;

	@Column({ type: 'int', unsigned: true, name: 'urls_count' })
	public urlsCount: number;

	@Column({ type: 'boolean', name: 'urls_count_precise', default: false })
	public urlsCountPrecise: boolean;

	@Column({
		type: 'json',
		transformer: {
			to: (value: ProviderPrices[]) => value,
			from: (value: { provider: Provider; price: { total: number; perUrl: number } }[]) => value?.map(p =>
				new ProviderPrices(p.provider, new PriceModel(p.price.total, p.price.perUrl)))
		}
	})
	public prices: ProviderPrices[];

	@Column({
		type: 'enum',
		enum: Currency,
		enumName: 'currency_enum',
		default: Currency.EUR
	})
	public currency: Currency;

	public get currencySymbol(): string {
		return CURRENCY_SYMBOLS[this.currency];
	}

	@OneToMany(() => Generation, generation => generation.calculation)
	public generations: Relation<Generation[]>;

	@CreateDateColumn({ name: 'created_at' })
	public createdAt: Date;
}

export { Calculation };
