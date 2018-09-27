export interface IApiOutput {
	body?: string | {};
	statusCode?: number;
	headers?: {[key: string]: string | boolean | number | null};
}
