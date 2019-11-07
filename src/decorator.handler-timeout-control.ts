import {EventEmitter} from "events";
import {AsyncLambdaHandler} from "./async-lambda-handler.type";
import TimeoutControl from "./timeout-control.class";

/**
 *
 * @param handler
 * @param timeOutSecureMargin
 * @param eventEmitter
 */
export default function decorateHandlerWithTimeoutControl<I, O>(
	handler: AsyncLambdaHandler<I, O>,
	timeOutSecureMargin: number,
	eventEmitter: EventEmitter,
): AsyncLambdaHandler<I, O> {

	return async (input, ctx) => {
		const timeoutControl = new TimeoutControl(ctx, timeOutSecureMargin);
		timeoutControl.eventEmitter = eventEmitter;
		try {
			const response = await handler(input, ctx);
			timeoutControl.clear();
			return response;
		} catch (err) {
			timeoutControl.clear();

			throw err;
		}
	};
}
