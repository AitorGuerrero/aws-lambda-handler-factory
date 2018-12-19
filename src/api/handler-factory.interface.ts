import {EventEmitter} from "events";
import {LambdaHandler} from "../handler-factory.class";
import {IApiInput} from "./api-input.interface";
import {ApiHandler} from "./handler-factory.class";
import {IApiOutput} from "./output.interface";

/**
 * A interface to allow object decorator pattern
 */
export interface IAwsLambdaApiHandlerFactory {
	readonly eventEmitter: EventEmitter;
	readonly callbacks: {
		onError: Array<(err: Error) => (Promise<any> | any)>;
	};
	build(apiHandler: ApiHandler): LambdaHandler<IApiInput, IApiOutput>;
}
