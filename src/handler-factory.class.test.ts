/* tslint:disable:no-unused-expression */

import {expect} from "chai";
import {beforeEach, describe} from "mocha";
import HandlerCustomError from "./error.handler-custom.class";
import AwsLambdaHandlerFactory, {Handler, handlerEventType} from './handler-factory.class';
import {Context} from 'aws-lambda';

describe("Having a handler factory", () => {

	const ctx = {getRemainingTimeInMillis: () => 0} as Context;
	const handlerResponse = "response";

	let factory: AwsLambdaHandlerFactory;
	let handle: Handler<any, any>;

	beforeEach(() => {
		factory = new AwsLambdaHandlerFactory();
		handle = factory.build(async () => handlerResponse);
	});
	it("should call the callback with the response", async () => {
		const response = await handle(null, ctx);
		expect(response).to.be.equal(handlerResponse);
	});
	it("should call onInit callback before calling the handler", async () => {
		let callBackCalled = false;
		let callbackCalledBeforeHandler = false;
		factory.callbacks.initialize.push(() => callBackCalled = true);
		handle = factory.build(async () => callbackCalledBeforeHandler = !callBackCalled);
		await handle(null, ctx);
		expect(callBackCalled).to.be.true;
		expect(callbackCalledBeforeHandler).to.be.false;
	});
	it("should call onSucceeded callback after calling the handler", async () => {
		let callBackCalled = false;
		let callbackCalledBeforeHandler = false;
		factory.callbacks.flush.push(() => callBackCalled = true);
		handle = factory.build(async () => callbackCalledBeforeHandler = !callBackCalled);
		await handle(null, ctx);
		expect(callBackCalled).to.be.true;
		expect(callbackCalledBeforeHandler).to.be.true;
	});
	it("should not call onError callback", async () => {
		let callBackCalled = false;
		factory.callbacks.handleError.push(() => callBackCalled = true);
		await handle(null, ctx);
		expect(callBackCalled).to.be.false;
	});
	describe("and the handler fails", () => {
		const error = new Error("ERROR");
		beforeEach(() => {
			handle = factory.build(() => Promise.reject(error));
		});
		it("should emit the error", async () => {
			let emittedErr: Error | undefined;
			factory.eventEmitter.on(handlerEventType.error, (err) => {
				emittedErr = err;
				throw err;
			});
			await handle(null, ctx).catch((e: Error) => emittedErr = e);
			expect(emittedErr).to.be.eq(error);
		});
		it("should call the handler callback with the error", async () => {
			let emittedErr: Error | undefined;
			await handle(null, ctx).catch((e: Error) => emittedErr = e);
			expect(emittedErr).to.be.eq(error);
		});
		it("should emit finished event", async () => {
			let emittedFinished = false;
			factory.eventEmitter.on(handlerEventType.finished, () => emittedFinished = true);
			await handle(null, ctx).catch((): void => undefined);
			expect(emittedFinished).to.be.true;
		});
		it("should not emit succeeded event", async () => {
			let emitted = false;
			factory.eventEmitter.on(handlerEventType.succeeded, () => emitted = true);
			await handle(null, ctx).catch((): void => undefined);
			expect(emitted).to.be.false;
		});
		it("should call onError callback after calling the handler", async () => {
			let callBackCalled = false;
			let callbackCalledBeforeHandler = false;
			factory.callbacks.handleError.push(() => callBackCalled = true);
			handle = factory.build(async () => {
				callbackCalledBeforeHandler = !callBackCalled;
				throw error;
			});
			await handle(null, ctx).catch((): void => undefined);
			expect(callBackCalled).to.be.true;
			expect(callbackCalledBeforeHandler).to.be.true;
		});
	});
	describe("and the handler fails with custom response", () => {
		const errorContent = "ERROR CONTENT";
		const error = new HandlerCustomError(errorContent);
		beforeEach(() => handle = factory.build(() => Promise.reject(error)));
		it("should return the error content", async () => {
			const response = await handle(null, ctx);
			expect(response).to.be.eql(errorContent);
		});
		it("should emit the error", async () => {
			let emittedErr: any = null;
			factory.eventEmitter.on(handlerEventType.error, (err) => {
				emittedErr = err;
				throw err;
			});
			await handle(null, ctx);
			expect(emittedErr).to.be.eq(error);
		});
		it("should emit finished event", async () => {
			let emittedFinished = false;
			factory.eventEmitter.on(handlerEventType.finished, () => emittedFinished = true);
			await handle(null, ctx);
			expect(emittedFinished).to.be.true;
		});
		it("should not emit succeeded event", async () => {
			let emitted = false;
			factory.eventEmitter.on(handlerEventType.succeeded, () => emitted = true);
			await handle(null, ctx);
			expect(emitted).to.be.false;
		});
	});
});
