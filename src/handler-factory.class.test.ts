import * as expect from 'expect';
import { beforeEach, describe } from 'mocha';
import { Context } from 'aws-lambda';
import HandlerCustomError from './error.handler-custom.class';
import AwsLambdaHandlerFactory, { handlerEventType } from './handler-factory.class';
import { AsyncHandler } from './aws-lambda-handler';

describe('Having a handler factory', () => {
	const ctx = { getRemainingTimeInMillis: () => 0 } as Context;
	const handlerResponse = 'response';

	let factory: AwsLambdaHandlerFactory;
	let handle: AsyncHandler<unknown, unknown>;

	beforeEach(() => {
		factory = new AwsLambdaHandlerFactory();
		handle = factory.build(async () => handlerResponse);
	});
	it('should call the callback with the response', async () => {
		const response = await handle(null, ctx);
		expect(response).toStrictEqual(handlerResponse);
	});
	it('should call onInit callback before calling the handler', async () => {
		let callBackCalled = false;
		let callbackCalledBeforeHandler = false;
		factory.callbacks.initialize.push(() => (callBackCalled = true));
		handle = factory.build(async () => (callbackCalledBeforeHandler = !callBackCalled));
		await handle(null, ctx);
		expect(callBackCalled).toBeTruthy();
		expect(callbackCalledBeforeHandler).toBeFalsy();
	});
	it('should call onSucceeded callback after calling the handler', async () => {
		let callBackCalled = false;
		let callbackCalledBeforeHandler = false;
		factory.callbacks.flush.push(() => (callBackCalled = true));
		handle = factory.build(async () => (callbackCalledBeforeHandler = !callBackCalled));
		await handle(null, ctx);
		expect(callBackCalled).toBeTruthy();
		expect(callbackCalledBeforeHandler).toBeTruthy();
	});
	it('should not call onError callback', async () => {
		let callBackCalled = false;
		factory.callbacks.handleError.push(() => (callBackCalled = true));
		await handle(null, ctx);
		expect(callBackCalled).toBeFalsy();
	});
	describe('and the handler fails', () => {
		const error = new Error('ERROR');
		beforeEach(() => {
			handle = factory.build(() => Promise.reject(error));
		});
		it('should emit the error', async () => {
			let emittedErr: Error | undefined;
			factory.eventEmitter.on(handlerEventType.error, (err) => {
				emittedErr = err;
				throw err;
			});
			await handle(null, ctx).catch((e: Error) => (emittedErr = e));
			expect(emittedErr).toStrictEqual(error);
		});
		it('should call the handler callback with the error', async () => {
			let emittedErr: Error | undefined;
			await handle(null, ctx).catch((e: Error) => (emittedErr = e));
			expect(emittedErr).toStrictEqual(error);
		});
		it('should emit finished event', async () => {
			let emittedFinished = false;
			factory.eventEmitter.on(handlerEventType.finished, () => (emittedFinished = true));
			await handle(null, ctx).catch((): void => undefined);
			expect(emittedFinished).toBeTruthy();
		});
		it('should not emit succeeded event', async () => {
			let emitted = false;
			factory.eventEmitter.on(handlerEventType.succeeded, () => (emitted = true));
			await handle(null, ctx).catch((): void => undefined);
			expect(emitted).toBeFalsy();
		});
		it('should call onError callback after calling the handler', async () => {
			let callBackCalled = false;
			let callbackCalledBeforeHandler = false;
			factory.callbacks.handleError.push(() => (callBackCalled = true));
			handle = factory.build(async () => {
				callbackCalledBeforeHandler = !callBackCalled;
				throw error;
			});
			await handle(null, ctx).catch((): void => undefined);
			expect(callBackCalled).toBeTruthy();
			expect(callbackCalledBeforeHandler).toBeTruthy();
		});
	});
	describe('and the handler fails with custom response', () => {
		const errorContent = 'ERROR CONTENT';
		const error = new HandlerCustomError(errorContent);
		beforeEach(() => (handle = factory.build(() => Promise.reject(error))));
		it('should return the error content', async () => {
			const response = await handle(null, ctx);
			expect(response).toStrictEqual(errorContent);
		});
		it('should emit the error', async () => {
			let emittedErr: any = null;
			factory.eventEmitter.on(handlerEventType.error, (err) => {
				emittedErr = err;
				throw err;
			});
			await handle(null, ctx);
			expect(emittedErr).toStrictEqual(error);
		});
		it('should emit finished event', async () => {
			let emittedFinished = false;
			factory.eventEmitter.on(handlerEventType.finished, () => (emittedFinished = true));
			await handle(null, ctx);
			expect(emittedFinished).toBeTruthy();
		});
		it('should not emit succeeded event', async () => {
			let emitted = false;
			factory.eventEmitter.on(handlerEventType.succeeded, () => (emitted = true));
			await handle(null, ctx);
			expect(emitted).toBeFalsy();
		});
	});
});
