import {EventEmitter} from "events";
import {LambdaHandler} from "../handler-factory.class";
import {IApiInput} from "./api-input.interface";
import {ApiHandler} from "./handler-factory.class";
import {IAwsLambdaApiHandlerFactory} from "./handler-factory.interface";
import {IApiOutput} from "./output.interface";

export class HeadersDecorator implements IAwsLambdaApiHandlerFactory {

	public readonly callbacks: { onError: (err: Error) => any };
	public readonly eventEmitter: EventEmitter;

	constructor(
		private originalFactory: IAwsLambdaApiHandlerFactory,
		private headers: {[hederName: string]: string},
	) {
		this.callbacks = originalFactory.callbacks;
		this.eventEmitter = originalFactory.eventEmitter;
	}

	public build(apiHandler: ApiHandler): LambdaHandler<IApiInput, IApiOutput> {
		return this.originalFactory.build(async (input, ctx) => {
			const result = await apiHandler(input, ctx);

			return Object.assign({headers: this.headers}, result);
		});
	}

}
