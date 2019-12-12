import {EventEmitter} from "events";
import Callbacks from "./callbacks.class";
import IContext from "./context-interface";
import {LambdaHandler} from "./handler-factory.class";

export default interface IHandlerFactory {
	readonly callbacks: Callbacks;
	readonly eventEmitter: EventEmitter;
	build<I, O>(handler: (event: I, ctx: IContext) => Promise<O> | O): LambdaHandler<I, O>;
}
