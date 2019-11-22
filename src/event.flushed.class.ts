import {IContext} from "./context-interface";

export default class Flushed<O> {

	public static code = "flushed";

	constructor(
		public readonly output: O,
		public readonly ctx: IContext,
	) {}
}
