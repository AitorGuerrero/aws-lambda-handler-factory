import ApiRequestFailed from "./error.api-request.class";

export default class ApiUnprocessableEntity extends ApiRequestFailed {

	public readonly statusCode: number = 422;

	public constructor(message?: string) {
		super(
			"unauthorized",
			message || "You are not authorized to access this resource",
		);
	}
}
