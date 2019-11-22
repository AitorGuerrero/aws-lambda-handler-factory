import {IContext} from "./context-interface";

export default class EventInit<I> {

	public static code = "initializing";

	constructor(
		public readonly input: I,
		public readonly ctx: IContext,
	) {}
}
