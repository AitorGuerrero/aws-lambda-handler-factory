import * as expect from 'expect';
import { beforeEach, describe } from 'mocha';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import HandlerCustomError from '../error.handler-custom.class';
import TimeoutReachedError from '../error.timeout-reached.class';
import AwsLambdaHandlerFactory, { handlerEventType } from '../handler-factory.class';
import { ApiRequestNotFoundError } from './error.not-found.class';
import { AwsLambdaApiHandlerFactory } from './handler-factory.class';
import { Handler } from '../aws-lambda-handler';

describe('Having a api handler factory', () => {
	let factory: AwsLambdaHandlerFactory;
	let apiFactory: AwsLambdaApiHandlerFactory;
	let handler: Handler;
	const ctx = { getRemainingTimeInMillis: () => 1000 * 60 } as Context;
	beforeEach(() => {
		factory = new AwsLambdaHandlerFactory();
		apiFactory = new AwsLambdaApiHandlerFactory(factory);
	});
	describe('and a simple handler defined', () => {
		beforeEach(() => (handler = apiFactory.build(async () => ({}))));
		it('should return empty body', async () => {
			const response = await handler(null, ctx);
			expect(response.body).toEqual('');
		});
		it('should return empty headers', async () => {
			const response = await handler(null, ctx);
			expect(typeof response.headers).toEqual('object');
			expect(Object.keys(response.headers).length).toEqual(0);
		});
		it('should return 200 status code', async () => {
			const response = await handler(null, ctx);
			expect(response.statusCode).toEqual(200);
		});
	});
	describe('and returning a object as a body', () => {
		beforeEach(() => (handler = apiFactory.build(async () => ({ body: { result: 'ok' } }))));
		it('should return the body stringified', async () => {
			const response = await handler(null, ctx);
			expect(response.body).toEqual('{"result":"ok"}');
		});
	});
	describe('and the handler fails with unknown error', () => {
		const error = new Error('thrownError');
		beforeEach(() => {
			handler = apiFactory.build(async () => {
				await new Promise((rs) => setTimeout(rs, 0));
				throw error;
			});
		});
		it('should await for onError callback', async () => {
			let onErrorCalled = false;
			apiFactory.callbacks.onError.push(() => (onErrorCalled = true));
			await handler(null, ctx);
			expect(onErrorCalled).toEqual(true);
		});
		it('should return server error', async () => {
			const response = await handler(null, ctx);
			expect(response.statusCode).toEqual(500);
		});
		it('should emit error event', async () => {
			const emittedErrorEvents: HandlerCustomError<unknown>[] = [];
			apiFactory.eventEmitter.on(handlerEventType.error, (e) => {
				emittedErrorEvents.push(e);

				throw e;
			});
			await handler(null, ctx);
			expect(emittedErrorEvents).toHaveLength(1);
			expect(emittedErrorEvents[0]).toBeInstanceOf(HandlerCustomError);
			expect(emittedErrorEvents[0].originalError).toStrictEqual(error);
		});
		it("should not emit handler factory 'on success' event", async () => {
			let called = false;
			apiFactory.eventEmitter.on(handlerEventType.succeeded, () => (called = true));
			await handler(null, ctx);
			expect(called).toBeFalsy();
		});
	});
	describe('and the handler fails with Api Request error', () => {
		const myCustomMessage = 'myCustomMessage';
		beforeEach(() => {
			handler = apiFactory.build(async () => {
				throw new ApiRequestNotFoundError(myCustomMessage);
			});
		});
		it('should return 404 status code', async () => {
			const response = await handler(null, ctx);
			expect(response.statusCode).toStrictEqual(ApiRequestNotFoundError.statusCode);
		});
		it('should return custom message', async () => {
			const response = await handler(null, ctx);
			expect(response.body).toEqual(myCustomMessage);
		});
	});
	describe('and cors config in the factory', () => {
		const allowCredentials = true;
		const allowedOrigin = 'allowedOrigin';
		beforeEach(
			() =>
				(apiFactory = new AwsLambdaApiHandlerFactory(factory, {
					allowCredentials,
					allowedOrigin,
				})),
		);
		it('Should add headers in the response', async () => {
			const response = await apiFactory.build(async () => ({}))(
				null as unknown as APIGatewayProxyEvent,
				ctx,
			);
			expect(response.headers!['Access-Control-Allow-Credentials']).toEqual(allowCredentials);
			expect(response.headers!['Access-Control-Allow-Origin']).toEqual(allowedOrigin);
		});
	});
	describe('and arrives timeout', () => {
		beforeEach(() => (ctx.getRemainingTimeInMillis = () => 1));
		it('should fail', async () => {
			let error: Error | undefined;
			await (
				apiFactory.build(() => new Promise((rs) => setTimeout(rs, 100)))(
					null as unknown as APIGatewayProxyEvent,
					ctx,
				) as Promise<unknown>
			).catch((e: Error) => (error = e));
			expect(error).toBeInstanceOf(TimeoutReachedError);
		});
	});
});
