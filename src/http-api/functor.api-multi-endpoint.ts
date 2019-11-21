import {EventEmitter} from "events";
import {AsyncLambdaHandler} from "../async-lambda-handler.type";
import {IApiInput} from "./api-input.interface";
import ICorsConfig from "./cors-config.interface";
import decorateHttpApiHandlerWithHttpApiLogic from "./decorator.api-handler";
import IEndpointsMap from "./endpoints-map.interface";
import {IApiOutput} from "./output.interface";

/**
 * Builds a aws lambda handler for a lambda with multiple http events.
 * @param endpoints IEndpointsMap
 * @param corsConfig
 * @param eventEmitter
 */
export default function buildMultiEndpointHttpApiLambdaHandler(
	endpoints: IEndpointsMap,
	corsConfig: ICorsConfig,
	eventEmitter: EventEmitter,
): AsyncLambdaHandler<IApiInput, IApiOutput> {
	return decorateHttpApiHandlerWithHttpApiLogic(
		async (event, ctx) => {
			const handler = endpoints[event.resource][event.httpMethod];
			if (handler === undefined) {
				return {
					body: "",
					headers: {},
					statusCode: 404,
				};
			}

			return await handler(event, ctx);
		},
		corsConfig,
		eventEmitter,
	);
}
