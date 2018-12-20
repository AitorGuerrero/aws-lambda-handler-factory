import {LambdaHandler} from "../handler-factory.class";
import {IApiInput} from "./api-input.interface";
import {ApiHandler, AwsLambdaApiHandlerFactory} from "./handler-factory.class";
import {IApiOutput} from "./output.interface";

interface IResourceEndpoints {
	GET?: ApiHandler;
	PUT?: ApiHandler;
	POST?: ApiHandler;
	DELETE?: ApiHandler;
}

export interface IEndpoints {
	[route: string]: IResourceEndpoints;
}

interface IEndpointConfig {
	path: string;
	testRegExp: RegExp;
	paramsRegExp: RegExp;
	paramsNames: string[];
	handlers: {
		GET?: ApiHandler;
		PUT?: ApiHandler;
		POST?: ApiHandler;
		DELETE?: ApiHandler;
	};
}

const notFoundResponse = {
	body: "",
	headers: {},
	statusCode: 404,
};

/**
 * A factory class for creating a handler for a api with several endpoints.
 */
export class AwsLambdaProxyApiHandlerFactory {

	private static getParamsNamesFromPath(path: string) {
		const paramNamesRegExp = /[^{]*\{(.*?)\}/y;
		let match;
		const paramsNames: string[] = [];
		while (match = paramNamesRegExp.exec(path)) {
			paramsNames.push(match[1]);
		}

		return paramsNames;
	}

	private static getTestRegExpFromPath(path: string, basePath: string) {
		return new RegExp(`^${basePath}${path.replace(/{.*?}/g, "[^/]*")}$`);
	}

	private static getParamsRegExpFromPath(path: string, basePath: string) {
		return new RegExp(`^${basePath}${path.replace(/{.*?}/g, "([^/]*)")}$`);
	}

	private static getHandlerFromInput(input: IApiInput, config: IEndpointConfig) {
		if (config === undefined || config.handlers[input.httpMethod] === undefined) {
			return;
		}

		return config.handlers[input.httpMethod];
	}

	private static composeEndpointsConfig(endpoints: IEndpoints, basePathMapping?: string) {
		const endpointsConfig: IEndpointConfig[] = [];

		for (const endpointPath of Object.keys(endpoints)) {
			endpointsConfig.push({
				handlers: endpoints[endpointPath],
				paramsNames: AwsLambdaProxyApiHandlerFactory.getParamsNamesFromPath(endpointPath),
				paramsRegExp: AwsLambdaProxyApiHandlerFactory.getParamsRegExpFromPath(endpointPath, basePathMapping || ""),
				path: endpointPath,
				testRegExp: AwsLambdaProxyApiHandlerFactory.getTestRegExpFromPath(endpointPath, basePathMapping || ""),
			});
		}

		return endpointsConfig;
	}

	private endpointsConfig: IEndpointConfig[];

	constructor(
		private apiHandlerFactory: AwsLambdaApiHandlerFactory,
	) {}

	public build(basePathMapping: string, endpoints: IEndpoints): LambdaHandler<IApiInput, IApiOutput>;
	public build(endpoints: IEndpoints): LambdaHandler<IApiInput, IApiOutput>;
	public build(a: string | IEndpoints, b?: IEndpoints): LambdaHandler<IApiInput, IApiOutput> {
		let basePathMapping: string;
		let endpoints: IEndpoints;
		if (typeof a === "string") {
			endpoints = b;
			basePathMapping = a;
		} else {
			endpoints = a;
		}
		this.endpointsConfig = AwsLambdaProxyApiHandlerFactory.composeEndpointsConfig(endpoints, basePathMapping);

		return this.apiHandlerFactory.build(async (event, ctx) => {
			const handlerConfig = this.getHandlerConfigFromInput(event);
			if (handlerConfig === undefined) {
				return notFoundResponse;
			}
			const handler = AwsLambdaProxyApiHandlerFactory.getHandlerFromInput(event, handlerConfig);
			const parsedEvent = this.composeEvent(event, handlerConfig);
			if (handler === undefined) {
				return notFoundResponse;
			}
			const response = await handler(parsedEvent, ctx);

			return Object.assign({
				headers: {},
				statusCode: 200,
			}, response, {
				body: response.body === undefined ? "" : JSON.stringify(response.body),
			});
		});
	}

	private getHandlerConfigFromInput(input: IApiInput) {
		return this.endpointsConfig.find((o) => o.testRegExp.test(input.path));
	}

	private composeEvent(originalEvent: IApiInput, handlerConfig: IEndpointConfig) {
		const paramsValues = handlerConfig.paramsRegExp.exec(originalEvent.path);
		return Object.assign({}, originalEvent, {
			path: handlerConfig.path,
			pathParameters: handlerConfig.paramsNames
				.map((p, i) => ({[p]: paramsValues[i + 1]}))
				.reduce((result, next) => Object.assign(result, next), {} as {[key: string]: string}),
		});
	}
}
