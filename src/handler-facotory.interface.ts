import {EventEmitter} from "events";
import Callbacks from "./callbacks.class";
import {LambdaHandler} from "./handler-factory.class";
import {Context} from 'aws-lambda';

export default interface IHandlerFactory {
	readonly callbacks: Callbacks;
	readonly eventEmitter: EventEmitter;
	build<I, O>(handler: (event: I, ctx: Context) => Promise<O> | O): LambdaHandler<I, O>;
}
