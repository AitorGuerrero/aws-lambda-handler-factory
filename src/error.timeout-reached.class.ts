export default class TimeoutReachedError<R> extends Error {
	constructor() {
		super("Timeout reached");
	}
}
