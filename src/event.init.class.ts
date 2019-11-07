import {IContext} from "./context-interface";

export default class EventInit<I> {

	public static code = "init";

	constructor(
		public readonly input: I,
		public readonly ctx: IContext,
	) {}
}
