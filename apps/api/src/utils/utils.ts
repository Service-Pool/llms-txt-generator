class Utils {
	public static slugify(value: string): string {
		return value
			.toLowerCase()
			.normalize('NFD').replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 80)
			|| 'untitled';
	}
}

export { Utils };
