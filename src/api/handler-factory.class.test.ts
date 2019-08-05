/* tslint:disable */
import {expect} from "chai";
import {beforeEach, describe} from "mocha";
import {AwsLambdaHandlerFactory, handlerEventType, LambdaHandler} from "../handler-factory.class";
import {IContext} from "../context-interface";
import {ApiRequestNotFoundError} from "./error.not-found.class";
import {AwsLambdaApiHandlerFactory} from "./handler-factory.class";

describe("Having a api handler factory", () => {
	let factory: AwsLambdaHandlerFactory;
	let apiFactory: AwsLambdaApiHandlerFactory;
	let handler: LambdaHandler<any, any>;
	const ctx = {getRemainingTimeInMillis: () => 0} as IContext;
	beforeEach(() => {
		factory = new AwsLambdaHandlerFactory();
		factory.eventEmitter.on('error', () => null);
		apiFactory = new AwsLambdaApiHandlerFactory(factory);
		apiFactory.eventEmitter.on('error', () => null);
	});
	describe("and a simple handler defined", () => {
		beforeEach(() => handler = apiFactory.build(async () => ({})));
		it("should return empty body", async () => {
			const response = await asyncHandler(handler)(null, ctx);
			expect(response.body).to.be.equal("");
		});
		it("should return empty headers", async () => {
			const response = await asyncHandler(handler)(null, ctx);
			expect(typeof response.headers).to.be.eq("object");
			expect(Object.keys(response.headers).length).to.be.eq(0);
		});
		it("should return 200 status code", async () => {
			const response = await asyncHandler(handler)(null, ctx);
			expect(response.statusCode).to.be.eq(200);
		});
	});
	describe("and returning a object as a body", () => {
		beforeEach(() => handler = apiFactory.build(async () => ({body: {result: "ok"}})));
		it("should return the body stringified", async () => {
			const response = await asyncHandler(handler)(null, ctx);
			expect(response.body).to.be.equal("{\"result\":\"ok\"}");
		});
	});
	describe("and the handler fails with unknown error", () => {
		const error = new Error("thrownError");
		beforeEach(() => {
			apiFactory.eventEmitter.on("error", () => null);
			handler = apiFactory.build(async () => {
				await new Promise((rs) => setTimeout(rs, 0));
				throw error;
			});
		});
		it("should await for onError callback", async () => {
			let onErrorCalled = false;
			apiFactory.callbacks.onError.push(() => onErrorCalled = true);
			try {await asyncHandler(handler)(null, ctx);}
			catch (err) {}
			expect(onErrorCalled).to.be.equal(true);
		});
		it("should return server error",  async () => {
			let response: any;
			try {response = await asyncHandler(handler)(null, ctx);}
			catch (err) {}
			expect(response.statusCode).to.be.equal(500);
		});
		it("should emit error event", async () => {
			let emittedEvent: Error = null;
			apiFactory.eventEmitter.on("error", (e) => emittedEvent = e);
			try {await asyncHandler(handler)(null, ctx);}
			catch (err) {}
			expect(emittedEvent).to.be.equal(error);
		});
		it("should not emit handler factory 'on success' event", async () => {
			let called = false;
			factory.eventEmitter.on(handlerEventType.succeeded, () => called = true);
			try {
				await asyncHandler(handler)(null, ctx);
			} catch (e) {}
			expect(called).to.be.false;
		});
	});
	describe('and the handler fails with Api Request error', () => {
		const myCustomMessage = "myCustomMessage";
		beforeEach(() => {
			apiFactory.eventEmitter.on("error", () => null);
			handler = apiFactory.build(async () => {
				throw new ApiRequestNotFoundError(myCustomMessage);
			});
		});
		it("should return 404 status code", async () => {
			const response = await asyncHandler(handler)(null, ctx);
			expect(response.statusCode).to.be.eq(ApiRequestNotFoundError.statusCode);
		});
		it("should return custom message", async () => {
			const response = await asyncHandler(handler)(null, ctx);
			expect(response.body).to.be.eq(myCustomMessage);
		});
	});
});

function asyncHandler<I, O>(handler: LambdaHandler<I, O>) {
	return (input: I, ctx: IContext) =>
		new Promise<O>((rs, rj) => handler(input, ctx, (err, data) => err ? rj(err) : rs(data)));
}
