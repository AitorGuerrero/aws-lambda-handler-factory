export default class HandlerCustomError<R> extends Error {
	constructor(
		public readonly response: R,
		public readonly originalError?: Error,
	) {
		super("Handler custom error");
	}
}
