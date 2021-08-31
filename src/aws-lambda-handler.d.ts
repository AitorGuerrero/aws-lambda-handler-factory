import { Callback, Context } from 'aws-lambda/handler';

type SyncHandler<TEvent = any, TResult = any> = (
	event: TEvent,
	context: Context,
	callback: Callback<TResult>,
) => void;

type AsyncHandler<TEvent = any, TResult = any> = (
	event: TEvent,
	context: Context,
) => Promise<TResult>;

export type Handler<TEvent = any, TResult = any> = SyncHandler<TEvent, TResult> &
	AsyncHandler<TEvent, TResult>;
