/* tslint:disable:no-unused-expression */

import {expect} from "chai";
import {beforeEach, describe} from "mocha";
import {AwsLambdaHandlerFactory, HandlerEventType, LambdaHandler} from "./aws-lambda-handler-factory.class";
import {IContext} from "./context-interface";

describe("Having a handler factory", () => {

	const ctx = {getRemainingTimeInMillis: () => 0} as IContext;
	const response = "response";

	let factory: AwsLambdaHandlerFactory;
	let handle: LambdaHandler<any, any>;

	beforeEach(() => {
		factory = new AwsLambdaHandlerFactory();
		handle = factory.build(() => response);
	});
	it("should call the callback with the response", async () => {
		const handlerResponse = await asyncHandler(handle)(null, ctx);
		expect(handlerResponse).to.be.equal(response);
	});
	it("should call onInit callback before calling the handler", async () => {
		let callBackCalled = false;
		let callbackCalledBeforeHandler = false;
		factory.callbacks.onInit = () => callBackCalled = true;
		handle = factory.build(() => callbackCalledBeforeHandler = callBackCalled === false);
		await asyncHandler(handle)(null, ctx);
		expect(callBackCalled).to.be.true;
		expect(callbackCalledBeforeHandler).to.be.false;
	});
	it("should call onSucceeded callback after calling the handler", async () => {
		let callBackCalled = false;
		let callbackCalledBeforeHandler = false;
		factory.callbacks.onSucceeded = () => callBackCalled = true;
		handle = factory.build(() => callbackCalledBeforeHandler = callBackCalled === false);
		await asyncHandler(handle)(null, ctx);
		expect(callBackCalled).to.be.true;
		expect(callbackCalledBeforeHandler).to.be.true;
	});
	it("should not call onError callback", async () => {
		let callBackCalled = false;
		factory.callbacks.onError = () => callBackCalled = true;
		await asyncHandler(handle)(null, ctx);
		expect(callBackCalled).to.be.false;
	});
	describe("and the handler fails", () => {
		const error = new Error("ERROR");
		beforeEach(() => {
			factory.eventEmitter.on("error", () => null);
			handle = factory.build(() => Promise.reject(error));
		});
		it("should emit the error", async () => {
			let emittedErr: any = null;
			factory.eventEmitter.on("error", (err) => emittedErr = err);
			await new Promise((rs) => handle(null, ctx, (err) => rs(err)));
			await new Promise((rs) => setTimeout(rs, 0)); // enqueue process
			expect(emittedErr).to.be.eq(error);
		});
		it("should call the handler callback with the error", async () => {
			const err = await new Promise((rs) => handle(null, ctx, (e) => rs(e)));
			expect(err).to.be.eq(error);
		});
		it("should emit finished event", async () => {
			let emittedFinished = false;
			factory.eventEmitter.on(HandlerEventType.finished, () => emittedFinished = true);
			await new Promise((rs) => handle(null, ctx, (err) => rs(err)));
			await new Promise((rs) => setTimeout(rs, 0)); // enqueue process
			expect(emittedFinished).to.be.true;
		});
		it("should call onError callback after calling the handler", async () => {
			let callBackCalled = false;
			let callbackCalledBeforeHandler = false;
			factory.callbacks.onError = () => callBackCalled = true;
			handle = factory.build(async () => {
				callbackCalledBeforeHandler = callBackCalled === false;
				throw error;
			});
			try {
				await asyncHandler(handle)(null, ctx);
				expect.fail("Should fail");
			} catch (err) {
				expect(callBackCalled).to.be.true;
				expect(callbackCalledBeforeHandler).to.be.true;
			}
		});
	});
});

function asyncHandler<I, O>(handler: LambdaHandler<I, O>) {
	return (input: I, ctx: IContext) =>
		new Promise<O>((rs, rj) => handler(input, ctx, (err, data) => err ? rj(err) : rs(data)));
}
