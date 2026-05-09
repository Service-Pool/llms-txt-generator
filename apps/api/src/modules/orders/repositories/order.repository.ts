import { Injectable } from '@nestjs/common';
import { DataSource, Repository, FindOneOptions, FindManyOptions } from 'typeorm';
import { Order } from '@/modules/orders/entities/order.entity';

@Injectable()
export class OrderRepository extends Repository<Order> {
	private readonly OUTPUT_PREVIEW_LENGTH = 3000;

	constructor(dataSource: DataSource) {
		super(Order, dataSource.createEntityManager());
	}

	async findOne(options: FindOneOptions<Order> & { withDeleted?: boolean }, withFull: (keyof Order)[] = []): Promise<Order | null> {
		const query = this.createQueryBuilder('order');

		if (options?.where) {
			if (Array.isArray(options.where)) {
				(options.where as object[]).forEach((w) => {
					query.orWhere(w);
				});
			} else {
				query.where(options.where);
			}
		}

		if (options?.withDeleted) {
			query.withDeleted();
		}

		query.select(this.selectFields);
		this.addHiddenSelects(query, withFull);

		if (options?.relations && Array.isArray(options.relations)) {
			(options.relations as string[]).forEach((rel) => {
				query.leftJoinAndSelect(`order.${rel}`, rel);
			});
		}

		const entities = await this.mapHiddenFields(query);
		return entities[0] ?? null;
	}

	async findAndCount(options: FindManyOptions<Order>, withFull: (keyof Order)[] = []): Promise<[Order[], number]> {
		const query = this.createQueryBuilder('order');

		if (options?.where) {
			if (Array.isArray(options.where)) {
				(options.where as object[]).forEach((w) => {
					query.orWhere(w);
				});
			} else {
				query.where(options.where);
			}
		}

		if (options?.order) {
			Object.entries(options.order).forEach(([field, direction]) => {
				query.orderBy(`order.${field}`, direction as 'ASC' | 'DESC');
			});
		}

		if (options?.skip) {
			query.skip(options.skip);
		}

		if (options?.take) {
			query.take(options.take);
		}

		query.select(this.selectFields);
		this.addHiddenSelects(query, withFull);

		if (options?.relations && Array.isArray(options.relations)) {
			(options.relations as string[]).forEach((rel) => {
				query.leftJoinAndSelect(`order.${rel}`, rel);
			});
		}

		const [entities, count] = await Promise.all([
			this.mapHiddenFields(query),
			query.getCount()
		]);
		return [entities, count];
	}

	private get selectFields(): string[] {
		return this.metadata.columns
			.filter(col => col.isSelect !== false && col.propertyName !== 'output')
			.map(col => `order.${col.propertyName}`);
	}

	private addHiddenSelects(query: ReturnType<typeof this.createQueryBuilder>, withFull: (keyof Order)[]): void {
		const alias = query.alias;
		if (withFull.includes('output')) {
			query.addSelect(`\`${alias}\`.\`output\``, 'output');
		} else {
			query.addSelect(
				`CASE WHEN CHAR_LENGTH(\`${alias}\`.\`output\`) > ${this.OUTPUT_PREVIEW_LENGTH} THEN CONCAT(SUBSTRING(\`${alias}\`.\`output\`, 1, ${this.OUTPUT_PREVIEW_LENGTH}), '\n<!-- truncated -->') ELSE \`${alias}\`.\`output\` END`,
				'output'
			);
		}
	}

	private async mapHiddenFields(query: ReturnType<typeof this.createQueryBuilder>): Promise<Order[]> {
		const { entities, raw } = await query.getRawAndEntities();
		return entities.map((entity) => {
			const rawRow = (raw as Record<string, unknown>[]).find(r => r.order_id === entity.id);
			(entity as unknown as Record<string, unknown>).output = rawRow?.output;
			return entity;
		});
	}
}
