import { APIGatewayEvent, Context } from 'aws-lambda';
import { EventEmitter } from 'events';
import HandlerCustomError from '../error.handler-custom.class';
import AwsLambdaHandlerFactory from '../handler-factory.class';
import Callbacks from './callbacks.class';
import { ApiRequestError } from './error.api-request.class';
import { ApiOutput } from './output.interface';
import { Handler } from '../aws-lambda-handler';

export type ApiHandler = (input: APIGatewayEvent, ctx: Context) => Promise<ApiOutput>;

/**
 * A class for creating api gateway handlers
 */
export class AwsLambdaApiHandlerFactory {
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
		allowCredentials?: boolean;
		allowedOrigin?: string;
	};

	constructor(
		private handlerFactory: AwsLambdaHandlerFactory,
		corsConfig?: {
			allowCredentials?: boolean;
			allowedOrigin?: string;
		},
	) {
		this.eventEmitter = handlerFactory.eventEmitter;
		this.corsConfig = corsConfig || {};
	}

	/**
	 * Creates a basic handler.
	 *
	 * @param apiHandler
	 */
	public build(apiHandler: ApiHandler): Handler<APIGatewayEvent, ApiOutput> {
		return this.handlerFactory.build(async (input: APIGatewayEvent, ctx: Context) => {
			try {
				return this.composeResponse(await apiHandler(input, ctx));
			} catch (err) {
				await Promise.all(this.callbacks.onError.map((cb) => cb(err)));
				if (err instanceof ApiRequestError) {
					throw new HandlerCustomError(
						{
							body: err.message,
							headers: this.makeHeaders(),
							statusCode: err.statusCode,
						},
						err,
					);
				}
				throw new HandlerCustomError(
					{
						body: err.message,
						headers: this.makeHeaders(),
						statusCode: 500,
					},
					err,
				);
			}
		});
	}

	private composeResponse(response: ApiOutput) {
		return Object.assign(
			{
				statusCode: 200,
			},
			response,
			{
				body:
					response.body === undefined
						? ''
						: typeof response.body === 'string'
						? response.body
						: JSON.stringify(response.body),
				headers: this.makeHeaders(response.headers),
			},
		);
	}

	private makeHeaders(inputHeaders?: { [key: string]: string | boolean | number | null }) {
		const headers: { [key: string]: string | boolean | number | null } = {};
		if (this.corsConfig.allowCredentials) {
			headers['Access-Control-Allow-Credentials'] = this.corsConfig.allowCredentials;
		}
		if (this.corsConfig.allowedOrigin) {
			headers['Access-Control-Allow-Origin'] = this.corsConfig.allowedOrigin;
		}

		return Object.assign(headers, inputHeaders || {});
	}
}
