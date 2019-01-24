import {LambdaHandler} from "../handler-factory.class";
import {IApiInput} from "./api-input.interface";
import IEndpointsMap from "./endpoints-map.interface";
import {AwsLambdaApiHandlerFactory} from "./handler-factory.class";
import {IApiOutput} from "./output.interface";

/**
 * A factory class for creating a handler for a api with several endpoints.
 */
export class AwsLambdaApiMultiHandlerFactory {

	constructor(
		private apiHandlerFactory: AwsLambdaApiHandlerFactory,
	) {}

	public build(endpoints: IEndpointsMap): LambdaHandler<IApiInput, IApiOutput> {
		return this.apiHandlerFactory.build(async (event, ctx) => {
			const handler = endpoints[event.path][event.httpMethod];
			if (handler === undefined) {
				return {
					body: "",
					headers: {},
					statusCode: 404,
				};
			}
			const response = await handler(event, ctx);

			return Object.assign({
				headers: {},
				statusCode: 200,
			}, response, {
				body: response.body === undefined ? "" : JSON.stringify(response.body),
			});
		});
	}
}
