import {LambdaHandler} from "../aws-lambda-handler-factory.class";
import {IContext} from "../context-interface";
import {IApiInput} from "./api-input.interface";
import {AwsLambdaApiHandlerFactory} from "./handler-factory.class";
import {IApiOutput} from "./output.interface";

export type ApiHandler = (input: IApiInput, ctx: IContext) => Promise<IApiOutput> | IApiOutput;

interface IResourceEndpoints {
	GET?: ApiHandler;
	PUT?: ApiHandler;
	POST?: ApiHandler;
	DELETE?: ApiHandler;
}

export interface IEndpoints {
	[route: string]: IResourceEndpoints;
}

/**
 * A factory class for creating a handler for a api with several endpoints.
 */
export class AwsLambdaApiMultiEndpointHandlerFactory {

	constructor(
		private apiHandlerFactory: AwsLambdaApiHandlerFactory,
	) {}

	public build(endpoints: IEndpoints): LambdaHandler<IApiInput, IApiOutput> {
		return this.apiHandlerFactory.build(async (event, ctx) => {
			const resourceEndpoints = endpoints[event.resource];
			if (resourceEndpoints == undefined) {
				return {
					body: "",
					headers: {},
					statusCode: 404,
				};
			}
			const method: "GET" | "PUT" | "POST" | "DELETE" = event.httpMethod.toUpperCase() as any;
			if (typeof resourceEndpoints[method] === "function") {
				return resourceEndpoints[method](event, ctx);
			}

			return {
				body: "",
				headers: {},
				statusCode: 404,
			};
		});
	}
}
