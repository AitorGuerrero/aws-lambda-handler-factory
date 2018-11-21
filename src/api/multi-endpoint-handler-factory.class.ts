import {LambdaHandler} from "../aws-lambda-handler-factory.class";
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
	regExp: RegExp;
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
export class AwsLambdaApiMultiEndpointHandlerFactory {

	private static getParamsNamesFromPath(path: string) {
		const paramNamesRegExp = /[^{]*\{(.*?)\}/y;
		let match;
		const paramsNames: string[] = [];
		while (match = paramNamesRegExp.exec(path)) {
			paramsNames.push(match[1]);
		}

		return paramsNames;
	}

	private static getTestRegExpFromPath(path: string) {
		return new RegExp("^" + path.replace(/{.*?}/g, "(.*)") + "$");
	}

	private static getHandlerFromInput(input: IApiInput, config: IEndpointConfig) {
		if (config === undefined || config.handlers[input.httpMethod] === undefined) {
			return;
		}

		return config.handlers[input.httpMethod];
	}

	private static composeEndpointsConfig(endpoints: IEndpoints) {
		const endpointsConfig: IEndpointConfig[] = [];

		for (const endpointPath of Object.keys(endpoints)) {
			endpointsConfig.push({
				handlers: endpoints[endpointPath],
				paramsNames: AwsLambdaApiMultiEndpointHandlerFactory.getParamsNamesFromPath(endpointPath),
				path: endpointPath,
				regExp: AwsLambdaApiMultiEndpointHandlerFactory.getTestRegExpFromPath(endpointPath),
			});
		}

		return endpointsConfig;
	}

	private endpointsConfig: IEndpointConfig[];

	constructor(
		private apiHandlerFactory: AwsLambdaApiHandlerFactory,
	) {}

	public build(endpoints: IEndpoints): LambdaHandler<IApiInput, IApiOutput> {
		this.endpointsConfig = AwsLambdaApiMultiEndpointHandlerFactory.composeEndpointsConfig(endpoints);

		return this.apiHandlerFactory.build(async (event, ctx) => {
			const handlerConfig = this.getHandlerConfigFromInput(event);
			if (handlerConfig === undefined) {
				return notFoundResponse;
			}
			const handler = AwsLambdaApiMultiEndpointHandlerFactory.getHandlerFromInput(event, handlerConfig);
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
		return this.endpointsConfig.find((o) => o.regExp.test(input.path));
	}

	private composeEvent(originalEvent: IApiInput, handlerConfig: IEndpointConfig) {
		const paramsValues = handlerConfig.regExp.exec(originalEvent.path);

		return Object.assign({}, originalEvent, {
			path: handlerConfig.path,
			pathParameters: handlerConfig.paramsNames
				.map((p, i) => ({[p]: paramsValues[i + 1]}))
				.reduce((result, next) => Object.assign(result, next), {} as {[key: string]: string}),
		});
	}
}
