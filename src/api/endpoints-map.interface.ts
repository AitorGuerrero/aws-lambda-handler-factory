import {ApiHandler} from "./handler-factory.class";

export default interface IEndpointsMap {
	[route: string]: {
		GET?: ApiHandler;
		PUT?: ApiHandler;
		POST?: ApiHandler;
		DELETE?: ApiHandler;
	};
}
