import { Provider } from '../../../enums/provider.enum';

class PriceModel {
	public total: number;
	public perUrl: number;

	constructor(total: number, perUrl: number) {
		this.total = total;
		this.perUrl = perUrl;
	}
}

class ProviderPrices {
	public provider: Provider;
	public price: PriceModel;

	constructor(provider: Provider, price: PriceModel) {
		this.provider = provider;
		this.price = price;
	}
}

export { PriceModel, ProviderPrices };
