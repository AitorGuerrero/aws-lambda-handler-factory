import {IContext} from "./context-interface";

export default class InitializingFlush<O> {

	public static code = "initializingFlush";

	constructor(
		public readonly output: O,
		public readonly ctx: IContext,
	) {}
}
