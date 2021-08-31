import { APIGatewayProxyEvent } from 'aws-lambda';
import IEndpointsMap from './endpoints-map.interface';
import { ApiRequestNotFoundError } from './error.not-found.class';
import { ApiHandler, AwsLambdaApiHandlerFactory } from './handler-factory.class';
import { ApiOutput } from './output.interface';
import { Handler } from '../aws-lambda-handler';

interface IEndpointConfig {
	path: string;
	testRegExp: RegExp;
	paramsRegExp: RegExp;
	paramsNames: string[];
	handlers: {
		[httpMethod: string]: ApiHandler;
	};
}

/**
 * A factory class for creating a handler for a api with several endpoints.
 */
export class AwsLambdaProxyApiHandlerFactory {
	private static getParamsNamesFromPath(path: string) {
		const paramNamesRegExp = /[^{]*{(.*?)}/y;
		let match;
		const paramsNames: string[] = [];
		while ((match = paramNamesRegExp.exec(path))) {
			paramsNames.push(match[1]);
		}

		return paramsNames;
	}

	private static getTestRegExpFromPath(path: string, basePath: string) {
		return new RegExp(`^${basePath}${path.replace(/{.*?}/g, '[^/]*')}$`);
	}

	private static getParamsRegExpFromPath(path: string, basePath: string) {
		return new RegExp(`^${basePath}${path.replace(/{.*?}/g, '([^/]*)')}$`);
	}

	private static getHandlerFromInput(input: APIGatewayProxyEvent, config: IEndpointConfig) {
		if (config === undefined || config.handlers[input.httpMethod]! === undefined) {
			return;
		}

		return config.handlers[input.httpMethod];
	}

	private static composeEndpointsConfig(endpoints: IEndpointsMap, basePathMapping?: string) {
		const endpointsConfig: IEndpointConfig[] = [];

		for (const endpointPath of Object.keys(endpoints)) {
			endpointsConfig.push({
				handlers: endpoints[endpointPath],
				paramsNames: AwsLambdaProxyApiHandlerFactory.getParamsNamesFromPath(endpointPath),
				paramsRegExp: AwsLambdaProxyApiHandlerFactory.getParamsRegExpFromPath(
					endpointPath,
					basePathMapping || '',
				),
				path: endpointPath,
				testRegExp: AwsLambdaProxyApiHandlerFactory.getTestRegExpFromPath(
					endpointPath,
					basePathMapping || '',
				),
			});
		}

		return endpointsConfig;
	}

	private endpointsConfig: IEndpointConfig[];

	constructor(private apiHandlerFactory: AwsLambdaApiHandlerFactory) {}

	public build(
		basePathMapping: string,
		endpoints: IEndpointsMap,
	): Handler<APIGatewayProxyEvent, ApiOutput>;
	public build(endpoints: IEndpointsMap): Handler<APIGatewayProxyEvent, ApiOutput>;
	public build(
		a: string | IEndpointsMap,
		b?: IEndpointsMap,
	): Handler<APIGatewayProxyEvent, ApiOutput> {
		let basePathMapping: string | undefined;
		let endpoints: IEndpointsMap;
		if (typeof a === 'string') {
			endpoints = b!;
			basePathMapping = a;
		} else {
			endpoints = a;
		}
		this.endpointsConfig = AwsLambdaProxyApiHandlerFactory.composeEndpointsConfig(
			endpoints,
			basePathMapping,
		);

		return this.apiHandlerFactory.build(async (event, ctx) => {
			const handlerConfig = this.getHandlerConfigFromInput(event);
			if (handlerConfig === undefined) {
				throw new ApiRequestNotFoundError();
			}
			const handler = AwsLambdaProxyApiHandlerFactory.getHandlerFromInput(event, handlerConfig);
			const parsedEvent = this.composeEvent(event, handlerConfig);
			if (handler === undefined) {
				throw new ApiRequestNotFoundError();
			}
			const response = await handler(parsedEvent, ctx);

			return Object.assign(
				{
					headers: {},
					statusCode: 200,
				},
				response,
				{
					body: response.body === undefined ? '' : JSON.stringify(response.body),
				},
			);
		});
	}

	private getHandlerConfigFromInput(input: APIGatewayProxyEvent) {
		return this.endpointsConfig.find((o) => o.testRegExp.test(input.path));
	}

	private composeEvent(originalEvent: APIGatewayProxyEvent, handlerConfig: IEndpointConfig) {
		const paramsValues = handlerConfig.paramsRegExp.exec(originalEvent.path);

		return Object.assign({}, originalEvent, {
			path: handlerConfig.path,
			pathParameters: handlerConfig.paramsNames
				.map((p, i) => ({ [p]: paramsValues![i + 1] }))
				.reduce((result, next) => Object.assign(result, next), {} as { [key: string]: string }),
		});
	}
}
