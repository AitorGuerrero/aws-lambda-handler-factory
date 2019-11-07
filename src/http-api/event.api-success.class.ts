import {IContext} from "../context-interface";
import {IApiInput} from "./api-input.interface";
import {IApiOutput} from "./output.interface";

export default class EventApiSuccessSuccess {

	public static code = "apiSuccess";

	constructor(
		public readonly input: IApiInput,
		public readonly output: IApiOutput,
		public readonly ctx: IContext,
	) {}
}
