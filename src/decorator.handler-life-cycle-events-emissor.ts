import {EventEmitter} from "events";
import {AsyncLambdaHandler} from "./async-lambda-handler.type";
import EventError from "./event.error.class";
import EventInit from "./event.init.class";
import EventSuccess from "./event.success.class";

/**
 *
 * @param handler
 * @param eventEmitter
 */
export default function decorateHandlerWithLifeCycleEventsEmitter<I, O>(
	handler: AsyncLambdaHandler<I, O>,
	eventEmitter: EventEmitter,
): AsyncLambdaHandler<I, O> {
	return async (input, ctx) => {
		eventEmitter.emit(EventInit.code, new EventInit(input, ctx));
		try {
			const response = await handler(input, ctx);
			eventEmitter.emit(EventSuccess.code, new EventSuccess(input, response, ctx));

			return response;
		} catch (err) {
			eventEmitter.emit(EventError.code, new EventError(input, err, ctx));

			throw err;
		}
	};
}
