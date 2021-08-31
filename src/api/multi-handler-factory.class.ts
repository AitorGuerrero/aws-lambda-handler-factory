import { APIGatewayProxyEvent } from 'aws-lambda';
import IEndpointsMap from './endpoints-map.interface';
import { ApiRequestNotFoundError } from './error.not-found.class';
import { AwsLambdaApiHandlerFactory } from './handler-factory.class';
import { ApiOutput } from './output.interface';
import { Handler } from '../aws-lambda-handler';

/**
 * A factory class for creating a handler for a api with several endpoints.
 */
export class AwsLambdaApiMultiHandlerFactory {
	constructor(private apiHandlerFactory: AwsLambdaApiHandlerFactory) {}

	public build(endpoints: IEndpointsMap): Handler<APIGatewayProxyEvent, ApiOutput> {
		return this.apiHandlerFactory.build(async (event, ctx) => {
			const handler = endpoints[event.resource][event.httpMethod];
			if (handler === undefined) {
				throw new ApiRequestNotFoundError();
			}
			const response = await handler(event, ctx);

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
}
