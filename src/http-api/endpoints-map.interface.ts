import {ApiHandler} from "./decorator.api-handler";
import HttpMethod from "./http-methods.enum";

export default interface IEndpointsMap {
	[route: string]: {
		[HttpMethod.get]?: ApiHandler;
		[HttpMethod.patch]?: ApiHandler;
		[HttpMethod.put]?: ApiHandler;
		[HttpMethod.post]?: ApiHandler;
		[HttpMethod.delete]?: ApiHandler;
	};
}
