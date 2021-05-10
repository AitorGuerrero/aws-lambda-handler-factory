import {ApiHandler} from "./handler-factory.class";
import HttpMethod from "./http-methods.enum";

export default interface IEndpointsMap {
	[route: string]: {
		[httpMethod: string]: ApiHandler;
	};
}
