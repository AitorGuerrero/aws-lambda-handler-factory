import {EventEmitter} from "events";
import {AwsLambdaHandlerFactory, LambdaHandler} from "../aws-lambda-handler-factory.class";
import {IContext} from "../context-interface";
import {IApiInput} from "./api-input.interface";
import ApiRequestError from "./api-request-error.class";
import {IAwsLambdaApiHandlerFactory} from "./handler-factory.interface";
import {IApiOutput} from "./output.interface";

export type ApiHandler = (input: IApiInput, ctx: IContext) => Promise<IApiOutput> | IApiOutput;

/**
 * A class for creating api gateway handlers
 */
export class AwsLambdaApiHandlerFactory implements IAwsLambdaApiHandlerFactory {

	/**
	 * Emits the events defined in the HandlerEventType enum
	 * IMPORTANT!!
	 * Remember to handle the 'error' events
	 * https://nodejs.org/api/events.html#events_error_events
	 */
	public readonly eventEmitter = new EventEmitter();

	/**
	 * Functions executed in some execution points.
	 * They can be overwritten, and admits async functions. If you overwrite them, remember to call the original
	 * function.
	 * e.g:
	 * const originalOnError = handlerFactory.callbacks.onError;
	 * handlerFactory.callbacks.onInit = async (input, ctx) => {
	 *     // Your stuff
	 *     await onError(input, ctx);
	 * }
	 */
	public readonly callbacks: {
		onError: (err: Error) => any;
	} = {
		onError: () => Promise.resolve(),
	};

	constructor(
		private handlerFactory: AwsLambdaHandlerFactory,
	) {}

	/**
	 * Creates a basic handler.
	 * @param apiHandler
	 */
	public build(apiHandler: ApiHandler): LambdaHandler<IApiInput, IApiOutput> {
		return this.handlerFactory.build(async (input: IApiInput, ctx: IContext) => {
			try {
				return composeResponse(await apiHandler(input, ctx));
			} catch (err) {
				await this.callbacks.onError(err);
				await this.eventEmitter.emit("error", err);
				return (err instanceof ApiRequestError) ? buildErrorResponse(err) : buildServerErrorResponse();
			}
		});
	}
}

function buildServerErrorResponse() {
	return {
		body: JSON.stringify({
			error: { code: "system-error" },
			success: false,
		}),
		headers: {},
		statusCode: 500,
	};
}

function buildErrorResponse(err: ApiRequestError) {
	return {
		body: JSON.stringify({
			error: { code: err.name },
			success: false,
		}),
		headers: {},
		statusCode: err.statusCode,
	};
}

function composeResponse(response: IApiOutput) {
	return Object.assign(
		{
			statusCode: 200,
		},
		response,
		{
			body: response.body === undefined ? ""
				: typeof response.body === "string" ? response.body
					: JSON.stringify(response.body),
			headers: Object.assign({}, response.headers !== undefined ? response.headers : {}),
		},
	);
}
