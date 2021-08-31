export interface ApiOutput {
	body?: unknown;
	statusCode?: number;
	headers?: { [key: string]: string | boolean | number | null };
}
