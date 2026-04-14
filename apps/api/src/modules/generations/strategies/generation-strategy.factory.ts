import { Injectable } from '@nestjs/common';
import { GenerationStrategy } from '@/enums/generation-strategy.enum';
import { FlatStrategy } from '@/modules/generations/strategies/flat.strategy';
import { ClusteredStrategy } from '@/modules/generations/strategies/clustered.strategy';
import type { IGenerationStrategy } from '@/modules/generations/interfaces/generation-strategy.interface';

@Injectable()
class GenerationStrategyFactory {
	constructor(
		private readonly flatStrategy: FlatStrategy,
		private readonly clusteredStrategy: ClusteredStrategy
	) { }

	public create(strategy: GenerationStrategy): IGenerationStrategy {
		switch (strategy) {
			case GenerationStrategy.FLAT:
				return this.flatStrategy;
			case GenerationStrategy.CLUSTERED:
				return this.clusteredStrategy;
			default:
				throw new Error(`Unknown generation strategy: ${strategy as string}`);
		}
	}
}

export { GenerationStrategyFactory };
