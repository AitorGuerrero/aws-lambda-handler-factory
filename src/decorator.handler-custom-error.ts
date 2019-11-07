import {AsyncLambdaHandler} from "./async-lambda-handler.type";
import {HandlerCustomError} from "./error.handler-custom.class";

/**
 *
 * @param handler
 */
export default function decorateHandlerWithCustomError<I, O>(
	handler: AsyncLambdaHandler<I, O>,
): AsyncLambdaHandler<I, O> {
	return async (input, ctx) => {
		try {
			return await handler(input, ctx);
		} catch (err) {
			if (err instanceof HandlerCustomError) {
				return err.response;
			} else {
				throw err;
			}
		}
	};
}
