import {IContext} from "./context-interface";

export default class EventPersisted<O> {

	public static code = "persisted";

	constructor(
		public readonly output: O,
		public readonly ctx: IContext,
	) {}
}
