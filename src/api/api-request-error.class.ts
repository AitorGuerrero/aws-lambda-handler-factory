export class ApiRequestError extends Error {

	protected _statusCode: number;

	constructor(code: string, message?: string) {
		super(message);
		this.name = code;
		this._statusCode = 400;
	}

	public get statusCode() {
		return this._statusCode;
	}
}
