export class ApiSystemError extends Error {
	public readonly statusCode: number = 500;

	constructor(code: string, message?: string) {
		super(message);
		this.name = code;
	}
}
