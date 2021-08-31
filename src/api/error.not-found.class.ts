import { ApiRequestError } from './error.api-request.class';

export class ApiRequestNotFoundError extends ApiRequestError {
	public static readonly statusCode = 404;
	public static readonly code = 'notFound';
	public static readonly message = 'The requested resource could not be found';

	public readonly statusCode: number = ApiRequestNotFoundError.statusCode;

	public constructor(message?: string) {
		super(ApiRequestNotFoundError.code, message || ApiRequestNotFoundError.message);
	}
}
