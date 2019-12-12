import {EventEmitter} from "events";
import ICallbacks from "./callbacks.interface";
import IContext from "./context-interface";
import {LambdaHandler} from "./handler-factory.class";

export default interface IHandlerFactory {
	readonly callbacks: ICallbacks;
	readonly eventEmitter: EventEmitter;
	build<I, O>(handler: (event: I, ctx: IContext) => Promise<O> | O): LambdaHandler<I, O>;
}
