import {EventEmitter} from "events";
import {IContext} from "../context-interface";
import {HandlerCustomError} from "../handler-custom-error.class";
import {AwsLambdaHandlerFactory, LambdaHandler} from "../handler-factory.class";
import {IApiInput} from "./api-input.interface";
import {ApiRequestError} from "./api-request-error.class";
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
	 * e.g:
	 * const originalOnError = handlerFactory.callbacks.onError;
	 * handlerFactory.callbacks.onInit.push(async (input, ctx) => {
	 *     // Your stuff
	 * });
	 */
	public readonly callbacks: {
		onError: Array<(err: Error) => (Promise<any> | any)>;
	} = {
		onError: [],
	};

	private corsConfig: {
		allowCredentials?: boolean,
		allowedOrigin?: string,
	};

	constructor(
		private handlerFactory: AwsLambdaHandlerFactory,
		corsConfig?: {
			allowCredentials?: boolean,
			allowedOrigin: string,
		},
	) {
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
				await this.eventEmitter.emit("error", err);
				throw (err instanceof ApiRequestError)
					? this.buildErrorResponse(err)
					: this.buildServerErrorResponse();
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

	private buildServerErrorResponse() {
		return new HandlerCustomError({
			body: JSON.stringify({
				error: { code: "system-error" },
				success: false,
			}),
			headers: this.makeHeaders(),
			statusCode: 500,
		});
	}

	private buildErrorResponse(err: ApiRequestError) {
		return new HandlerCustomError({
			body: JSON.stringify({
				error: { code: err.name },
				success: false,
			}),
			headers: this.makeHeaders(),
			statusCode: err.statusCode,
		});
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
