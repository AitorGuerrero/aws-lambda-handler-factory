import {IContext} from "./context-interface";

export default class Persisted<O> {

	public static code = "persisted";

	constructor(
		public readonly output: O,
		public readonly ctx: IContext,
	) {}
}
