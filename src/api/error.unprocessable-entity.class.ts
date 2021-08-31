import { ApiRequestError } from './error.api-request.class';

export class ApiUnprocessableEntityError extends ApiRequestError {
	public readonly statusCode: number = 422;

	public constructor(message?: string) {
		super('unauthorized', message || 'You are not authorized to access this resource');
	}
}
