/* tslint:disable */
import {expect} from "chai";
import {beforeEach, describe} from "mocha";
import HandlerCustomError from "../error.handler-custom.class";
import TimeoutReachedError from "../error.timeout-reached.class";
import AwsLambdaHandlerFactory, {handlerEventType, LambdaHandler} from "../handler-factory.class";
import IContext from "../context-interface";
import {ApiRequestNotFoundError} from "./error.not-found.class";
import {AwsLambdaApiHandlerFactory} from "./handler-factory.class";
import {IApiOutput} from "./output.interface";

describe("Having a api handler factory", () => {
	let factory: AwsLambdaHandlerFactory;
	let apiFactory: AwsLambdaApiHandlerFactory;
	let handler: LambdaHandler<any, any>;
	const ctx = {getRemainingTimeInMillis: () => 1000 * 60} as IContext;
	beforeEach(() => {
		factory = new AwsLambdaHandlerFactory();
		apiFactory = new AwsLambdaApiHandlerFactory(factory);
	});
	describe("and a simple handler defined", () => {
		beforeEach(() => handler = apiFactory.build(async () => ({})));
		it("should return empty body", async () => {
			const response = await handler(null, ctx);
			expect(response.body).to.be.equal("");
		});
		it("should return empty headers", async () => {
			const response = await handler(null, ctx);
			expect(typeof response.headers).to.be.eq("object");
			expect(Object.keys(response.headers).length).to.be.eq(0);
		});
		it("should return 200 status code", async () => {
			const response = await handler(null, ctx);
			expect(response.statusCode).to.be.eq(200);
		});
	});
	describe("and returning a object as a body", () => {
		beforeEach(() => handler = apiFactory.build(async () => ({body: {result: "ok"}})));
		it("should return the body stringified", async () => {
			const response = await handler(null, ctx);
			expect(response.body).to.be.equal("{\"result\":\"ok\"}");
		});
	});
	describe("and the handler fails with unknown error", () => {
		const error = new Error("thrownError");
		beforeEach(() => {
			handler = apiFactory.build(async () => {
				await new Promise((rs) => setTimeout(rs, 0));
				throw error;
			});
		});
		it("should await for onError callback", async () => {
			let onErrorCalled = false;
			apiFactory.callbacks.onError.push(() => onErrorCalled = true);
			await handler(null, ctx)
			expect(onErrorCalled).to.be.equal(true);
		});
		it("should return server error",  async () => {
			let response: any;
			response = await handler(null, ctx);
			expect(response.statusCode).to.be.equal(500);
		});
		it("should emit error event", async () => {
			let emittedErrorEvents: HandlerCustomError<unknown>[] = [];
			apiFactory.eventEmitter.on(handlerEventType.error, (e) => {
				emittedErrorEvents.push(e);

				throw e;
			});
			await handler(null, ctx);
			expect(emittedErrorEvents).to.be.length(1);
			expect(emittedErrorEvents[0]).to.be.instanceOf(HandlerCustomError);
			expect(emittedErrorEvents[0].originalError).to.be.eql(error);
		});
		it("should not emit handler factory 'on success' event", async () => {
			let called = false;
			apiFactory.eventEmitter.on(handlerEventType.succeeded, () => called = true);
			await handler(null, ctx);
			expect(called).to.be.false;
		});
	});
	describe('and the handler fails with Api Request error', () => {
		const myCustomMessage = "myCustomMessage";
		beforeEach(() => {
			handler = apiFactory.build(async () => {
				throw new ApiRequestNotFoundError(myCustomMessage);
			});
		});
		it("should return 404 status code", async () => {
			const response = await handler(null, ctx);
			expect(response.statusCode).to.be.eq(ApiRequestNotFoundError.statusCode);
		});
		it("should return custom message", async () => {
			const response = await handler(null, ctx);
			expect(response.body).to.be.eq(myCustomMessage);
		});
	});
	describe('and cors config in the factory', () => {
		const allowCredentials = true;
		const allowedOrigin = 'allowedOrigin';
		beforeEach(() => apiFactory = new AwsLambdaApiHandlerFactory(factory, {
			allowCredentials,
			allowedOrigin,
		}));
		it('Should add headers in the response', async () => {
			const response = await apiFactory.build(async () => ({}))(null, ctx) as IApiOutput;
			expect(response.headers["Access-Control-Allow-Credentials"]).to.be.equal(allowCredentials);
			expect(response.headers["Access-Control-Allow-Origin"]).to.be.equal(allowedOrigin);
		});
	});
	describe('and the context have no getRemainingTimeInMillis method', () => {
		beforeEach(() => ctx.getRemainingTimeInMillis = undefined);
		it('should not fail', async () => {
			const response = await apiFactory.build(() => ({}))(null, ctx);
			expect(response).not.to.be.instanceof(Error);
		});
	});
	describe('and arrives timeout', () => {
		beforeEach(() => ctx.getRemainingTimeInMillis = () => 1);
		it('should fail', async () => {
			let error: Error = null;
			await (apiFactory.build(() => new Promise((rs) => setTimeout(rs, 100)))(null, ctx) as Promise<unknown>)
				.catch((e: Error) => error = e);
			expect(error).to.be.instanceof(TimeoutReachedError);
		});
	});
});
