import {EventEmitter} from "events";
import Callbacks from "./callbacks.class";
import HandlerCustomError from "./error.handler-custom.class";
import TimeoutReachedError from "./error.timeout-reached.class";
import IHandlerFactory from "./handler-facotory.interface";
import {Context} from 'aws-lambda';

export type LambdaHandler<Input, Output> = (input: Input, ctx: Context) => Output | Error | Promise<Output | Error>;

/**
 * Emitted event types
 */
export enum handlerEventType {
	called = "called",
	succeeded = "succeeded",
	error = "error",
	finished = "finished",
	timeOut = "timeOut",
	persisted = "persisted",
}

/**
 * The base factory for creating handlers.
 * e.g.
 *
 * ```typescript
 * import {AwsLambdaHandlerFactory, HandlerEventType} from 'sls-handler-factory';
 * const factory = new AwsLambdaHandlerFactory();
 * factory.eventEmitter.on(HandlerEventType.error, (err) => console.log(err.stack));
 * factory.callbacks.onSucceeded(async () => {
 *     // Here you can handle infrastructure, e.g. here you could persist the domain state.
 * });
 * export const handle = factory.build(async (input, ctx) => {
 *     // Here lies your domain logic.
 * });
 * ```
 *
 */
export default class AwsLambdaHandlerFactory implements IHandlerFactory {

	/**
	 * Emits the events defined in the HandlerEventType enum
	 * IMPORTANT!!
	 * Remember to handle the 'error' events
	 * https://nodejs.org/api/events.html#events_error_events
	 */
	public readonly eventEmitter = new EventEmitter();

	/**
	 * The security timeout ms margin to emit the timeOut event.
	 */
	public timeOutSecureMargin = 500;

	private timer: any;

	constructor(
		/**
		 * Functions executed in some execution points.
		 */
		public readonly callbacks = new Callbacks(),
	) {}

	/**
	 * @generic I The input received by the handler
	 * @generic O The output emitted by the handler
	 * @param handler Your own handler
	 */
	public build<I, O>(handler: LambdaHandler<I, O>): LambdaHandler<I, O> {
		return async (input, ctx) => {
			try {
				try {
					return await this.executeTimeControlledHandler(input, ctx, handler);
				} catch (err) {
					this.clearTimeOutControl();
					return this.eventEmitter.emit(handlerEventType.error, err);
				}
			} catch (err) {
				this.clearTimeOutControl();
				return await this.handleError(err, ctx);
			}
		};
	}

	private async executeTimeControlledHandler<I, O>(input: I, ctx: Context, handler: LambdaHandler<I, O>) {
		const response = await Promise.race([
			this.executeHandler(input, ctx, handler),
			this.timeOut(this.getRemainingTime(ctx)),
		]);
		if (response instanceof Error) {
			throw response;
		}
		this.clearTimeOutControl();

		return response;
	}

	private async executeHandler<I, O>(input: I, ctx: Context, handler: LambdaHandler<I, O>) {
		await Promise.all(this.callbacks.initialize.map((c) => c(input, ctx)));
		this.eventEmitter.emit(handlerEventType.called, input, ctx);
		const response = await handler(input, ctx);
		await Promise.all(this.callbacks.persist.map((c) => c(response, ctx)));
		this.eventEmitter.emit(handlerEventType.persisted, response);
		await Promise.all(this.callbacks.flush.map((c) => c(response, ctx)));
		this.eventEmitter.emit(handlerEventType.succeeded, response);
		this.eventEmitter.emit(handlerEventType.finished);

		return response;
	}

	private async handleError(err: Error, ctx: Context) {
		await Promise.all(this.callbacks.handleError.map((c) => c(err, ctx)));
		this.eventEmitter.emit(handlerEventType.finished);
		if (err instanceof HandlerCustomError) {
			return err.response;
		} else {
			throw err;
		}
	}

	private timeOut(remainingTime: number | undefined) {
		if (remainingTime === undefined) {
			return;
		}
		return new Promise((rs) => {
			this.timer = setTimeout(() => rs(new TimeoutReachedError()), remainingTime <= 0 ? 0 : remainingTime);
		});
	}

	private getRemainingTime(ctx: Context) {
		if (ctx.getRemainingTimeInMillis === undefined) {
			return;
		}
		return ctx.getRemainingTimeInMillis() - this.timeOutSecureMargin;
	}

	private clearTimeOutControl() {
		if (this.timer === undefined) {
			return;
		}
		clearTimeout(this.timer);
		this.timer = undefined;
	}
}
