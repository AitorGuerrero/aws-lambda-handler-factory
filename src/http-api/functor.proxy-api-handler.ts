import {EventEmitter} from "events";
import {IApiInput} from "./api-input.interface";
import ICorsConfig from "./cors-config.interface";
import decorateHttpApiHandlerWithHttpApiLogic, {ApiHandler} from "./decorator.api-handler";
import IEndpointsMap from "./endpoints-map.interface";
import HttpMethod from "./http-methods.enum";

interface IEndpointConfig {
	path: string;
	testRegExp: RegExp;
	paramsRegExp: RegExp;
	paramsNames: string[];
	handlers: {
		[HttpMethod.get]?: ApiHandler;
		[HttpMethod.patch]?: ApiHandler;
		[HttpMethod.put]?: ApiHandler;
		[HttpMethod.post]?: ApiHandler;
		[HttpMethod.delete]?: ApiHandler;
	};
}

/**
 * Builds a aws lambda handler for a lambda with proxy http event.
 * @param basePathMapping string
 * @param endpoints IEndpointsMap
 * @param corsConfig ICorsConfig
 * @param eventEmitter EventEmitter
 */
export function buildHttpApiLambdaProxyHandler(
	basePathMapping: string,
	endpoints: IEndpointsMap,
	corsConfig: ICorsConfig,
	eventEmitter: EventEmitter,
): ApiHandler {
	const endpointsConfig = composeEndpointsConfig();

	return decorateHttpApiHandlerWithHttpApiLogic(
		async (event, ctx) => {
			const handlerConfig = getHandlerConfigFromInput(event);
			if (handlerConfig === undefined) {
				return {body: "", headers: {}, statusCode: 404};
			}
			const handler = getHandlerFromInput(event, handlerConfig);
			const parsedEvent = composeEvent(event, handlerConfig);
			if (handler === undefined) {
				return {body: "", headers: {}, statusCode: 404};
			}

			return await handler(parsedEvent, ctx);
		},
		corsConfig,
		eventEmitter,
	);

	function composeEndpointsConfig() {
		const composedEndpointsConfig: IEndpointConfig[] = [];

		for (const endpointPath of Object.keys(endpoints)) {
			composedEndpointsConfig.push({
				handlers: endpoints[endpointPath],
				paramsNames: getParamsNamesFromPath(endpointPath),
				paramsRegExp: getParamsRegExpFromPath(endpointPath, basePathMapping || ""),
				path: endpointPath,
				testRegExp: getTestRegExpFromPath(endpointPath, basePathMapping || ""),
			});
		}

		return composedEndpointsConfig;
	}

	function getParamsNamesFromPath(path: string) {
		const paramNamesRegExp = /[^{]*{(.*?)}/y;
		let match;
		const paramsNames: string[] = [];
		while (match = paramNamesRegExp.exec(path)) {
			paramsNames.push(match[1]);
		}

		return paramsNames;
	}

	function getParamsRegExpFromPath(path: string, basePath: string) {
		return new RegExp(`^${basePath}${path.replace(/{.*?}/g, "([^/]*)")}$`);
	}

	function getTestRegExpFromPath(path: string, basePath: string) {
		return new RegExp(`^${basePath}${path.replace(/{.*?}/g, "[^/]*")}$`);
	}

	function getHandlerFromInput(input: IApiInput, config: IEndpointConfig) {
		if (config === undefined || config.handlers[input.httpMethod] === undefined) {
			return;
		}

		return config.handlers[input.httpMethod];
	}

	function getHandlerConfigFromInput(input: IApiInput) {
		return endpointsConfig.find((o) => o.testRegExp.test(input.path));
	}

	function composeEvent(originalEvent: IApiInput, handlerConfig: IEndpointConfig) {
		const paramsValues = handlerConfig.paramsRegExp.exec(originalEvent.path);
		return Object.assign({}, originalEvent, {
			path: handlerConfig.path,
			pathParameters: handlerConfig.paramsNames
				.map((p, i) => ({[p]: paramsValues[i + 1]}))
				.reduce((result, next) => Object.assign(result, next), {} as {[key: string]: string}),
		});
	}
}
