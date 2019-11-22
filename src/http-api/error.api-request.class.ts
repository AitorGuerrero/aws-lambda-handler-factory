export default class ApiRequestFailed extends Error {

	public readonly statusCode: number = 400;

	constructor(code: string, message?: string) {
		super(message);
		this.name = code;
	}
}
