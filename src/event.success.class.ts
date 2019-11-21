import {IContext} from "./context-interface";

export default class EventSuccess<I, O> {

	public static code = "success";

	constructor(
		public readonly input: I,
		public readonly output: O,
		public readonly ctx: IContext,
	) {}
}