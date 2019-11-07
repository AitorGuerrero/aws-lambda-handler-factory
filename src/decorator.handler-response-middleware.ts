import {AsyncLambdaHandler} from "./async-lambda-handler.type";

/**
 *
 * @param handler
 * @param middleWare
 */
export function decorateHandlerWithOutputMiddleware<I, O, Modified>(
	handler: AsyncLambdaHandler<I, O>,
	middleWare: (output: O) => Modified | Promise<Modified>,
): AsyncLambdaHandler<I, Modified> {
	return async (input, ctx) => middleWare(await handler(input, ctx));
}
