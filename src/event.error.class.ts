import {IContext} from "./context-interface";

export default class EventError<I> {

	public static code = "error";

	constructor(
		public readonly input: I,
		public readonly error: Error,
		public readonly ctx: IContext,
	) {}
}
