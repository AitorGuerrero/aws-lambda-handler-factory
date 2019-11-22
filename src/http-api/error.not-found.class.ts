import ApiRequestFailed from "./error.api-request.class";

export default class ApiRequestNotFound extends ApiRequestFailed {

	public static readonly statusCode = 404;
	public static readonly code = "notFound";
	public static readonly message = "The requested resource could not be found";

	public readonly statusCode: number = ApiRequestNotFound.statusCode;

	public constructor(message?: string) {
		super(
			ApiRequestNotFound.code,
			message || ApiRequestNotFound.message,
		);
	}
}
