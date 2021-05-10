/* tslint:disable:no-unused-expression */
import {expect} from "chai";
import {beforeEach, describe} from "mocha";
import AwsLambdaHandlerFactory, {LambdaHandler} from "../handler-factory.class";
import {IApiInput} from "./api-input.interface";
import {AwsLambdaApiHandlerFactory} from "./handler-factory.class";
import HttpMethod from "./http-methods.enum";
import {IApiOutput} from "./output.interface";
import {AwsLambdaProxyApiHandlerFactory} from "./proxy-handler-factory.class";
import {Context} from 'aws-lambda';

describe("Having a proxy api handler factory", () => {

	const ctx = {getRemainingTimeInMillis: () => 0} as Context;
	const httpMethod = "GET";
	const paramName = "param";
	const paramValue = "paramValue";
	const baseMapping = "/baseMapping";

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
		handle = multiEndpointFactory.build(baseMapping, {[`/pre-path/{${paramName}}/post-path`]: {GET: (i) => {
			parsedInput = i;

			return output;
		}}});
		input = {
			httpMethod,
			path: `${baseMapping}/pre-path/${paramValue}/post-path`,
			resource: `/pre-path/${paramName}/post-path`,
		} as IApiInput;
	});
	it("should call the correct endpoint", async () => {
		await handle(input, ctx);
		expect(parsedInput).not.to.be.undefined;
	});
	it("should include the param in the input", async () => {
		await handle(input, ctx);
		expect(parsedInput.pathParameters[paramName]).to.be.equal(paramValue);
	});
	it("should return 200 http code", async () => {
		const parsedOutput = await handle(input, ctx);
		expect(parsedOutput.statusCode).to.be.eq(200);
	});
	it("should return empty string as response", async () => {
		const parsedOutput = await handle(input, ctx);
		expect(parsedOutput.body).to.be.eq("");
	});
	describe("and the endpoint returns a object", () => {
		beforeEach(() => output.body = {attr: "attr"});
		it("should return the body stringified", async () => {
			const parsedOutput = await handle(input, ctx);
			expect(JSON.parse(parsedOutput.body as string).attr).to.be.eq("attr");
		});
	});
	describe("and the called endpoint does'nt exist", () => {
		beforeEach(() => input.path = "NotFoundPath");
		it("should return not found", async () => {
			const response = await handle(input, ctx);
			expect(response.statusCode).to.be.equal(404);
		});
	});
	describe("and the called method does'nt exist", () => {
		beforeEach(() => input.httpMethod = HttpMethod.delete);
		it("should return not found", async () => {
			const response = await handle(input, ctx);
			expect(response.statusCode).to.be.equal(404);
		});
	});
});
