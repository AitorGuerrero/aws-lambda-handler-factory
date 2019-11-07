import {AsyncLambdaHandler} from "./async-lambda-handler.type";
import {IContext} from "./context-interface";

/**
 *
 * @param handler
 * @param middleWare
 */
export function decorateHandlerWithErrorMiddleware<I, O>(
	handler: AsyncLambdaHandler<I, O>,
	middleWare: (e: Error, ctx: IContext) => Promise<O>,
): AsyncLambdaHandler<I, O> {
	return async (input, ctx) => handler(input, ctx).catch((e) => middleWare(e, ctx));
}
