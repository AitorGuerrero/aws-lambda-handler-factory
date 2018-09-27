export interface IApiInput {
	body: string;
	headers: {
		[key: string]: string;
	};
	httpMethod: string;
	isBase64Encoded: boolean;
	path: string;
	pathParameters: {
		[key: string]: string;
	};
	queryStringParameters: {
		[key: string]: string;
	};
	resource: string;
	requestContext: {
		authorizer?: {
			principalId: string;
		};
		apiId?: string;
		stage?: string;
		requestId?: string;
		resourceId?: string;
		accountId?: string;
	};
	stageVariables: {
		[key: string]: string;
	};
}
