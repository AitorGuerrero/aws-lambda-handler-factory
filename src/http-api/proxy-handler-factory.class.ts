import {IApiInput} from "./api-input.interface";
import {ApiHandler} from "./decorator.api-handler";
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
 *
 * @param basePathMapping
 * @param endpoints
 */
export function buildHttpApiLambdaProxyHandler(
	basePathMapping: string,
	endpoints: IEndpointsMap,
): ApiHandler {
	const endpointsConfig = composeEndpointsConfig();

	return async (event, ctx) => {
		const handlerConfig = getHandlerConfigFromInput(event);
		if (handlerConfig === undefined) {
			return {body: "", headers: {}, statusCode: 404};
		}
		const handler = getHandlerFromInput(event, handlerConfig);
		const parsedEvent = composeEvent(event, handlerConfig);
		if (handler === undefined) {
			return {body: "", headers: {}, statusCode: 404};
		}
		const response = await handler(parsedEvent, ctx);

		return Object.assign({
			headers: {},
			statusCode: 200,
		}, response, {
			body: response.body === undefined ? "" : JSON.stringify(response.body),
		});
	};

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
		const paramNamesRegExp = /[^{]*\{(.*?)\}/y;
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
