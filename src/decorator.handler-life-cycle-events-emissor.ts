import {EventEmitter} from "events";
import {AsyncLambdaHandler} from "./async-lambda-handler.type";
import ErrorOcurred from "./event.error.class";
import Initialized from "./event.init.class";
import Succeeded from "./event.success.class";

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
		eventEmitter.emit(Initialized.code, new Initialized(input, ctx));
		try {
			const response = await handler(input, ctx);
			eventEmitter.emit(Succeeded.code, new Succeeded(input, response, ctx));

			return response;
		} catch (err) {
			eventEmitter.emit(ErrorOcurred.code, new ErrorOcurred(input, err, ctx));

			throw err;
		}
	};
}
