import ApiRequestFailed from "./error.api-request.class";

export default class ApiRequestUnauthorized extends ApiRequestFailed {
	public readonly statusCode: number = 401;

	public constructor(message?: string) {
		super(
			"unauthorized",
			message || "You are not authorized to access this resource",
		);
	}
}
