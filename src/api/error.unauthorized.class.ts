import {ApiRequestError} from "./error.api-request.class";

export class ApiRequestUnauthorizedError extends ApiRequestError {
	public readonly statusCode: number = 401;

	public constructor(message?: string) {
		super(
			"unauthorized",
			message || "You are not authorized to access this resource",
		);
	}
}
