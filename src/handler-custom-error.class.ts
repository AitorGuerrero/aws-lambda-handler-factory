export class HandlerCustomError<R> extends Error {
	constructor(
		public readonly response: R,
	) {
		super("Handler custom error");
	}
}
