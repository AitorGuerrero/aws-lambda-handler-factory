import {EventEmitter} from "events";
import {IContext} from "./context-interface";
import {LambdaHandler} from "./handler-factory.class";

type Callback = (response: unknown, ctx: IContext) => (Promise<unknown> | unknown);
type ErrorCallback = (err: Error, ctx: IContext) => (Promise<unknown> | unknown);

export interface ICallbacks {
	flush: Callback[];
	handleError: ErrorCallback[];
	initialize: Callback[];
	persist: Callback[];
}

export default interface IHandlerFactory {
	readonly callbacks: ICallbacks;
	readonly eventEmitter: EventEmitter;
	build<I, O>(handler: (event: I, ctx: IContext) => Promise<O> | O): LambdaHandler<I, O>;
}
