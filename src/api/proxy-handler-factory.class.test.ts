/* tslint:disable:no-unused-expression */
import {expect} from "chai";
import {beforeEach, describe} from "mocha";
import {IContext} from "../context-interface";
import {AwsLambdaHandlerFactory, LambdaHandler} from "../handler-factory.class";
import {IApiInput} from "./api-input.interface";
import {AwsLambdaApiHandlerFactory} from "./handler-factory.class";
import {AwsLambdaProxyApiHandlerFactory} from "./proxy-handler-factory.class";
import {IApiOutput} from "./output.interface";

describe("Having a proxy api handler factory", () => {

	const ctx = {getRemainingTimeInMillis: () => 0} as IContext;
	const httpMethod = "GET";
	const paramName = "param";
	const paramValue = "paramValue";

	let factory: AwsLambdaHandlerFactory;
	let apiFactory: AwsLambdaApiHandlerFactory;
	let multiEndpointFactory: AwsLambdaProxyApiHandlerFactory;
	let handle: LambdaHandler<any, any>;
	let input: IApiInput;
	let parsedInput: IApiInput;
	let output: IApiOutput;

	beforeEach(() => {
		factory = new AwsLambdaHandlerFactory();
		apiFactory = new AwsLambdaApiHandlerFactory(factory);
		output = {};
		multiEndpointFactory = new AwsLambdaProxyApiHandlerFactory(apiFactory);
		handle = multiEndpointFactory.build({[`/pre-path/{${paramName}}/post-path`]: {GET: (i) => {
			parsedInput = i;

			return output;
		}}});
		input = {
			httpMethod,
			path: `/pre-path/${paramValue}/post-path`,
		} as IApiInput;
	});
	it("should call the correct endpoint", async () => {
		await asyncHandler(handle)(input, ctx);
		expect(parsedInput).not.to.be.undefined;
	});
	it("should include the param in the input", async () => {
		await asyncHandler(handle)(input, ctx);
		expect(parsedInput.pathParameters[paramName]).to.be.equal(paramValue);
	});
	it("should return 200 http code", async () => {
		const parsedOutput = await asyncHandler(handle)(input, ctx);
		expect(parsedOutput.statusCode).to.be.eq(200);
	});
	it("should return empty string as response", async () => {
		const parsedOutput = await asyncHandler(handle)(input, ctx);
		expect(parsedOutput.body).to.be.eq("");
	});
	describe("and the endpoint returns a object", () => {
		beforeEach(() => output.body = {attr: "attr"});
		it("should return the body stringified", async () => {
			const parsedOutput = await asyncHandler(handle)(input, ctx);
			expect(JSON.parse(parsedOutput.body as string).attr).to.be.eq("attr");
		});
	});
	describe("and the called endpoint does'nt exist", () => {
		beforeEach(() => input.path = "NotFoundPath");
		it("should return not found", async () => {
			const response = await asyncHandler(handle)(input, ctx);
			expect(response.statusCode).to.be.equal(404);
		});
	});
	describe("and the called method does'nt exist", () => {
		beforeEach(() => input.httpMethod = "DELETE");
		it("should return not found", async () => {
			const response = await asyncHandler(handle)(input, ctx);
			expect(response.statusCode).to.be.equal(404);
		});
	});
});

function asyncHandler<I, O>(handler: LambdaHandler<I, IApiOutput>) {
	return (input: I, ctx: IContext) =>
		new Promise<IApiOutput>((rs, rj) => handler(input, ctx, (err, data) => err ? rj(err) : rs(data)));
}
