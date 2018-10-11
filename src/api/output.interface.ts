/* tslint:disable:ban-types */
export interface IApiOutput {
	body?: string | Object;
	statusCode?: number;
	headers?: {[key: string]: string | boolean | number | null};
}
