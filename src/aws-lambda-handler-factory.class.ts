import {EventEmitter} from "events";
import {IContext} from "./context-interface";

export type LambdaHandler<Input, Output> = (input: Input, ctx: IContext, cb: (error?: Error, data?: Output) => unknown)
	=> unknown;

/**
 * Emitted event types
 */
export enum handlerEventType {
	called = "called",
	succeeded = "succeeded",
	error = "error",
	finished = "finished",
	timeOut = "timeOut",
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
export class AwsLambdaHandlerFactory {

	/**
	 * Emits the events defined in the HandlerEventType enum
	 * IMPORTANT!!
	 * Remember to handle the 'error' events
	 * https://nodejs.org/api/events.html#events_error_events
	 */
	public readonly eventEmitter = new EventEmitter();

	/**
	 * Functions executed in some execution points.
	 * They can be overwritten, and admits async functions. If you overwrite them, remember to call the original
	 * function.
	 * e.g:
	 * const originalOnInit = handlerFactory.callbacks.onInit;
	 * handlerFactory.callbacks.onInit = async (input, ctx) => {
	 *     // Your stuff
	 *     await originalOnInit(input, ctx);
	 * }
	 */
	public readonly callbacks: {
		onInit: Array<(input: unknown, ctx: IContext) => (Promise<unknown> | unknown)>;
		onSucceeded: Array<(response: unknown) => (Promise<unknown> | unknown)>;
		onError: Array<(err: Error) => (Promise<unknown> | unknown)>;
	} = {
		onError: [],
		onInit: [],
		onSucceeded: [],
	};

	/**
	 * The security timeout ms margin to emit the timeOut event.
	 */
	public timeOutSecureMargin = 500;

	private timer: any;

	/**
	 * @generic I The input received by the handler
	 * @generic O The output emitted by the handler
	 * @param handler Your own handler
	 */
	public build<I, O>(handler: (event: I, ctx: IContext) => Promise<O> | O): LambdaHandler<I, O> {
		return async (input, ctx, cb) => {
			await Promise.all(this.callbacks.onInit.map((c) => c(input, ctx)));
			this.eventEmitter.emit(handlerEventType.called, input, ctx);
			this.controlTimeOut(ctx);
			try {
				const response = await handler(input, ctx);
				await Promise.all(this.callbacks.onSucceeded.map((c) => c(response)));
				cb(null, response);
				this.eventEmitter.emit(handlerEventType.succeeded, response);
			} catch (err) {
				cb(err);
				await Promise.all(this.callbacks.onError.map((c) => c(err)));
				this.eventEmitter.emit(handlerEventType.error, err);
			}
			this.eventEmitter.emit(handlerEventType.finished);
			this.clearTimeOutControl();
		};
	}

	private controlTimeOut(ctx: IContext) {
		if (ctx.getRemainingTimeInMillis === undefined) {
			return;
		}
		const remainingTime = ctx.getRemainingTimeInMillis() - this.timeOutSecureMargin;
		if (remainingTime <= 0) {
			return;
		}
		this.timer = setTimeout(() => this.eventEmitter.emit(handlerEventType.timeOut), remainingTime);
	}

	private clearTimeOutControl() {
		if (this.timer === undefined) {
			return;
		}
		clearTimeout(this.timer);
		this.timer = undefined;
	}
}
