export default class TimeoutReachedError extends Error {
	constructor() {
		super('Timeout reached');
	}
}
