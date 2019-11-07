import {EventEmitter} from "events";
import {AsyncLambdaHandler} from "../async-lambda-handler.type";
import {IContext} from "../context-interface";
import {decorateHandlerWithErrorMiddleware} from "../decorator.handler-error-middleware";
import decorateHandlerWithLifeCycleEventsEmitter from "../decorator.handler-life-cycle-events-emissor";
import {decorateHandlerWithOutputMiddleware} from "../decorator.handler-response-middleware";
import EventSuccess from "../event.success.class";
import {IApiInput} from "./api-input.interface";
import {ApiRequestError} from "./error.api-request.class";
import EventApiSuccessSuccess from "./event.api-success.class";
import {IApiOutput} from "./output.interface";

export type ApiHandler = (input: IApiInput, ctx: IContext) => Promise<IApiOutput> | IApiOutput;

/**
 * Decorates a handler with http api features:
 * - Adds cors headers
 * - Adds default response attributes
 * - Emits apiSuccess event with the response mutated
 *
 * @param handler
 * @param corsConfig
 * @param eventEmitter
 */
export default function decorateHttpApiHandlerWithHttpApiLogic(
	handler: AsyncLambdaHandler<IApiInput, IApiOutput>,
	corsConfig: {
		allowCredentials?: boolean,
		allowedOrigin?: string,
	},
	eventEmitter: EventEmitter,
): AsyncLambdaHandler<IApiInput, IApiOutput> {
	const apiEventEmitter = new EventEmitter();
	apiEventEmitter.on(
		EventSuccess.code,
		(e: EventSuccess<IApiInput, IApiOutput>) => eventEmitter.emit(
			EventApiSuccessSuccess.code,
			new EventApiSuccessSuccess(e.input, e.output, e.ctx),
		),
	);

	return decorateHandlerWithLifeCycleEventsEmitter(
		decorateHandlerWithErrorMiddleware(
			decorateHandlerWithOutputMiddleware(
				handler,
				(o: IApiOutput) => Object.assign(
					{
						statusCode: 200,
					},
					o,
					{
						body: o.body === undefined ? ""
							: typeof o.body === "string" ? o.body
								: JSON.stringify(o.body),
						headers: makeHeaders(o.headers),
					},
				),
			),
			async (err) => ({
				body: err.message,
				headers: makeHeaders(),
				statusCode: (err instanceof ApiRequestError) ? err.statusCode : 500,
			}),
		),
		apiEventEmitter,
	);

	function makeHeaders(inputHeaders?: {[key: string]: string | boolean | number | null}) {
		const headers: {[key: string]: string | boolean | number | null} = {};
		if (corsConfig.allowCredentials) {
			headers["Access-Control-Allow-Credentials"] = corsConfig.allowCredentials;
		}
		if (corsConfig.allowedOrigin) {
			headers["Access-Control-Allow-Origin"] = corsConfig.allowedOrigin;
		}

		return Object.assign(headers, inputHeaders || {});
	}
}
