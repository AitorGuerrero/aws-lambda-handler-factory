import {EventEmitter} from "events";
import {AsyncLambdaHandler} from "./async-lambda-handler.type";
import {decorateHandlerWithCallbacks, ErrorCallback, PostCallback, PreCallback} from "./decorator.handler-callbacks";
import decorateHandlerWithCustomError from "./decorator.handler-custom-error";
import decorateHandlerWithLifeCycleEventsEmitter from "./decorator.handler-life-cycle-events-emissor";
import decorateHandlerWithTimeoutControl from "./decorator.handler-timeout-control";
import EventError from "./event.error.class";
import EventFlushed from "./event.flushed.class";
import EventPersisted from "./event.persisted.class";
import EventSuccess from "./event.success.class";

export interface ICallbacks<I, O> {
	flush: Array<PostCallback<O>>;
	handleError: ErrorCallback[];
	initialize: Array<PreCallback<I>>;
	persist: Array<PostCallback<O>>;
}

/**
 * Decorates lambda aysnc handler with:
 * - Init callback and event
 * - Persist callback and event.
 * - Flush callback and event.
 * - Error callback and event.
 * - Timeout control.
 * - Custom error for returning error withhout throwing
 *
 * The life cycle is:
 * - Initialization
 * - Handler execution
 * - Persistence
 * - Flushing
 *
 * @param handler
 * @param callbacks
 * @param eventEmitter
 * @param timeOutSecureMargin
 */

export function decorateHandler<I, O>(
	handler: AsyncLambdaHandler<I, O>,
	callbacks: ICallbacks<I, O>,
	eventEmitter: EventEmitter,
	timeOutSecureMargin = 500,
): AsyncLambdaHandler<I, O> {
	return decorateHandlerWithCustomError(
		decorateWithError(
			decorateWithInit(
				decorateWithFlush(
					decorateWithPersist(
						decorateHandlerWithTimeoutControl(
							handler,
							timeOutSecureMargin,
							eventEmitter,
						),
					),
				),
			),
		),
	);

	function decorateWithPersist(h: AsyncLambdaHandler<I, O>): AsyncLambdaHandler<I, O> {
		const persistEventEmitter = new EventEmitter();
		persistEventEmitter.on(
			EventSuccess.code,
			(e: EventSuccess<I, O>) => eventEmitter.emit(EventPersisted.code, new EventPersisted(e.output, e.ctx)),
		);
		persistEventEmitter.on(EventError.code, (e: EventError<I>) => eventEmitter.emit(EventError.code, e));
		return decorateHandlerWithLifeCycleEventsEmitter(
			decorateHandlerWithCallbacks(h, {post: callbacks.persist}),
			persistEventEmitter,
		);
	}

	function decorateWithFlush(h: AsyncLambdaHandler<I, O>): AsyncLambdaHandler<I, O> {
		const flushEventEmitter = new EventEmitter();
		flushEventEmitter.on(
			EventSuccess.code,
			(e: EventSuccess<I, O>) => eventEmitter.emit(EventFlushed.code, new EventFlushed(e.output, e.ctx)),
		);
		flushEventEmitter.on(EventError.code, (e: EventError<I>) => eventEmitter.emit(EventError.code, e));
		return decorateHandlerWithLifeCycleEventsEmitter(
			decorateHandlerWithCallbacks(
				decorateWithPersist(h),
				{post: callbacks.flush},
			),
			flushEventEmitter,
		);
	}

	function decorateWithInit(h: AsyncLambdaHandler<I, O>): AsyncLambdaHandler<I, O> {
		return decorateHandlerWithLifeCycleEventsEmitter(
			decorateHandlerWithCallbacks(
				h,
				{pre: callbacks.initialize},
			),
			eventEmitter,
		);
	}

	function decorateWithError(h: AsyncLambdaHandler<I, O>): AsyncLambdaHandler<I, O> {
		return decorateHandlerWithLifeCycleEventsEmitter(
			decorateHandlerWithCallbacks(
				h,
				{handleError: callbacks.handleError},
			),
			eventEmitter,
		);
	}
}
