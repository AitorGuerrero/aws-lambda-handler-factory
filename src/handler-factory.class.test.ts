/* tslint:disable:no-unused-expression */

import {expect} from "chai";
import {beforeEach, describe} from "mocha";
import {IContext} from "./context-interface";
import {HandlerCustomError} from "./handler-custom-error.class";
import {AwsLambdaHandlerFactory, handlerEventType, LambdaHandler} from "./handler-factory.class";

describe("Having a handler factory", () => {

	const ctx = {getRemainingTimeInMillis: () => 0} as IContext;
	const handlerResponse = "response";

	let factory: AwsLambdaHandlerFactory;
	let handle: LambdaHandler<any, any>;

	beforeEach(() => {
		factory = new AwsLambdaHandlerFactory();
		handle = factory.build(() => handlerResponse);
	});
	it("should call the callback with the response", async () => {
		const response = await asyncHandler(handle)(null, ctx);
		expect(response).to.be.equal(handlerResponse);
	});
	it("should call onInit callback before calling the handler", async () => {
		let callBackCalled = false;
		let callbackCalledBeforeHandler = false;
		factory.callbacks.onInit.push(() => callBackCalled = true);
		handle = factory.build(() => callbackCalledBeforeHandler = callBackCalled === false);
		await asyncHandler(handle)(null, ctx);
		expect(callBackCalled).to.be.true;
		expect(callbackCalledBeforeHandler).to.be.false;
	});
	it("should call onSucceeded callback after calling the handler", async () => {
		let callBackCalled = false;
		let callbackCalledBeforeHandler = false;
		factory.callbacks.onSucceeded.push(() => callBackCalled = true);
		handle = factory.build(() => callbackCalledBeforeHandler = callBackCalled === false);
		await asyncHandler(handle)(null, ctx);
		expect(callBackCalled).to.be.true;
		expect(callbackCalledBeforeHandler).to.be.true;
	});
	it("should not call onError callback", async () => {
		let callBackCalled = false;
		factory.callbacks.onError.push(() => callBackCalled = true);
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
			factory.eventEmitter.on(handlerEventType.finished, () => emittedFinished = true);
			await new Promise((rs) => handle(null, ctx, (err) => rs(err)));
			await new Promise((rs) => setTimeout(rs, 0)); // enqueue process
			expect(emittedFinished).to.be.true;
		});
		it("should not emit succeeded event", async () => {
			let emitted = false;
			factory.eventEmitter.on(handlerEventType.succeeded, () => emitted = true);
			await new Promise((rs) => handle(null, ctx, (err) => rs(err)));
			await new Promise((rs) => setTimeout(rs, 0)); // enqueue process
			expect(emitted).to.be.false;
		});
		it("should call onError callback after calling the handler", async () => {
			let callBackCalled = false;
			let callbackCalledBeforeHandler = false;
			factory.callbacks.onError.push(() => callBackCalled = true);
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
	describe("and the handler fails with custom response", () => {
		const errorContent = "ERROR CONTENT";
		const error = new HandlerCustomError(errorContent);
		beforeEach(() => {
			factory.eventEmitter.on("error", () => null);
			handle = factory.build(() => Promise.reject(error));
		});
		it("should return the error content", async () => {
			const response = await new Promise<HandlerCustomError<unknown>>(
				(rs, rj) => handle(null, ctx, (err, data) => err ? rj(err) : rs(data)),
			);
			expect(response).to.be.eql(errorContent);
		});
		it("should emit the error", async () => {
			let emittedErr: any = null;
			factory.eventEmitter.on("error", (err) => emittedErr = err);
			await new Promise((rs) => handle(null, ctx, (err) => rs(err)));
			await new Promise((rs) => setTimeout(rs, 0)); // enqueue process
			expect(emittedErr).to.be.eq(error);
		});
		it("should emit finished event", async () => {
			let emittedFinished = false;
			factory.eventEmitter.on(handlerEventType.finished, () => emittedFinished = true);
			await new Promise((rs) => handle(null, ctx, (err) => rs(err)));
			await new Promise((rs) => setTimeout(rs, 0)); // enqueue process
			expect(emittedFinished).to.be.true;
		});
		it("should not emit succeeded event", async () => {
			let emitted = false;
			factory.eventEmitter.on(handlerEventType.succeeded, () => emitted = true);
			await new Promise((rs) => handle(null, ctx, (err) => rs(err)));
			await new Promise((rs) => setTimeout(rs, 0)); // enqueue process
			expect(emitted).to.be.false;
		});
	});
});

function asyncHandler<I, O>(handler: LambdaHandler<I, O>) {
	return (input: I, ctx: IContext) =>
		new Promise<O>((rs, rj) => handler(input, ctx, (err, data) => err ? rj(err) : rs(data)));
}
