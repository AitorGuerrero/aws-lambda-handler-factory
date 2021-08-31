import { ApiHandler } from './handler-factory.class';

export default interface IEndpointsMap {
	[route: string]: {
		[httpMethod: string]: ApiHandler;
	};
}
