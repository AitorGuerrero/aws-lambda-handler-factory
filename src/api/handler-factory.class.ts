import {EventEmitter} from "events";
import IContext from "../context-interface";
import HandlerCustomError from "../error.handler-custom.class";
import AwsLambdaHandlerFactory, {LambdaHandler} from "../handler-factory.class";
import {IApiInput} from "./api-input.interface";
import Callbacks from "./callbacks.class";
import {ApiRequestError} from "./error.api-request.class";
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
	 * - To add some action, push the callback function to the array
	 * - admits async functions.
	 * function.
	 */
	public readonly callbacks = new Callbacks();

	private corsConfig: {
		allowCredentials?: boolean,
		allowedOrigin?: string,
	};

	constructor(
		private handlerFactory: AwsLambdaHandlerFactory,
		corsConfig?: {
			allowCredentials?: boolean,
			allowedOrigin?: string,
		},
	) {
		this.eventEmitter = handlerFactory.eventEmitter;
		this.corsConfig = corsConfig || {};
	}

	/**
	 * Creates a basic handler.
	 * @param apiHandler
	 */
	public build(apiHandler: ApiHandler): LambdaHandler<IApiInput, IApiOutput> {
		return this.handlerFactory.build(async (input: IApiInput, ctx: IContext) => {
			try {
				return this.composeResponse(await apiHandler(input, ctx));
			} catch (err) {
				await Promise.all(this.callbacks.onError.map((cb) => cb(err)));
				if (err instanceof ApiRequestError) {
					throw new HandlerCustomError({
						body: err.message,
						headers: this.makeHeaders(),
						statusCode: err.statusCode,
					}, err);
				}
				throw new HandlerCustomError({
					body: err.message,
					headers: this.makeHeaders(),
					statusCode: 500,
				}, err);
			}
		});
	}

	private composeResponse(response: IApiOutput) {
		return Object.assign(
			{
				statusCode: 200,
			},
			response,
			{
				body: response.body === undefined ? ""
					: typeof response.body === "string" ? response.body
						: JSON.stringify(response.body),
				headers: this.makeHeaders(response.headers),
			},
		);
	}

	private makeHeaders(inputHeaders?: {[key: string]: string | boolean | number | null}) {
		const headers: {[key: string]: string | boolean | number | null} = {};
		if (this.corsConfig.allowCredentials) {
			headers["Access-Control-Allow-Credentials"] = this.corsConfig.allowCredentials;
		}
		if (this.corsConfig.allowedOrigin) {
			headers["Access-Control-Allow-Origin"] = this.corsConfig.allowedOrigin;
		}

		return Object.assign(headers, inputHeaders || {});
	}
}
