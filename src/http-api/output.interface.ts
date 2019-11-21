export interface IApiOutput {
	body?: string | object;
	statusCode?: number;
	headers?: {[key: string]: string | boolean | number | null};
}
