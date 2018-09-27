import {expect} from "chai";
import {beforeEach, describe} from "mocha";
import {AwsLambdaHandlerFactory, LambdaHandler} from "../aws-lambda-handler-factory.class";
import {IContext} from "../context-interface";
import {IApiInput} from "./api-input.interface";
import {AwsLambdaApiHandlerFactory} from "./handler-factory.class";
import {AwsLambdaApiMultiEndpointHandlerFactory, IEndpoints} from "./multi-endpoint-handler-factory.class";

describe("Having a multi endpoint handler factory", () => {

	const ctx = {getRemainingTimeInMillis: () => 0} as IContext;
	const resource = "path";
	const httpMethod = "GET";

	let factory: AwsLambdaHandlerFactory;
	let apiFactory: AwsLambdaApiHandlerFactory;
	let multiEndpointFactory: AwsLambdaApiMultiEndpointHandlerFactory;
	let endpoints: IEndpoints;
	let handle: LambdaHandler<any, any>;
	let input: IApiInput;

	beforeEach(() => {
		factory = new AwsLambdaHandlerFactory();
		apiFactory = new AwsLambdaApiHandlerFactory(factory);
		multiEndpointFactory = new AwsLambdaApiMultiEndpointHandlerFactory(apiFactory);
		endpoints = {[resource]: {[httpMethod]: () => ({})}};
		handle = multiEndpointFactory.build(endpoints);
		input = {resource, httpMethod} as IApiInput;
	});
	it("should call the correct endpoint", async () => {
		const body = "BODY";
		endpoints = {[resource]: {[httpMethod]: () => ({body})}};
		handle = multiEndpointFactory.build(endpoints);
		const response = await asyncHandler(handle)(input, ctx);
		expect(response.body).to.be.equal(body);
	});
	describe("and the called endpoint does'nt exist", () => {
		beforeEach(() => input.resource = "NotFoundPath");
		it("should return not found", async () => {
			const response = await asyncHandler(handle)(input, ctx);
			expect(response.statusCode).to.be.equal(404);
		});
	});
	describe("and the called method does'nt exist", () => {
		beforeEach(() => input.httpMethod = "NotFoundPath");
		it("should return not found", async () => {
			const response = await asyncHandler(handle)(input, ctx);
			expect(response.statusCode).to.be.equal(404);
		});
	});
});

function asyncHandler<I, O>(handler: LambdaHandler<I, O>) {
	return (input: I, ctx: IContext) =>
		new Promise<O>((rs, rj) => handler(input, ctx, (err, data) => err ? rj(err) : rs(data)));
}
