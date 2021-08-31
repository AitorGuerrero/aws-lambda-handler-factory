import { Context } from 'aws-lambda';

export type Callback = (response: unknown, ctx: Context) => Promise<unknown> | unknown;
export type ErrorCallback = (err: Error, ctx: Context) => Promise<unknown> | unknown;

export default class Callbacks {
	public readonly flush: Callback[] = [];
	public readonly handleError: ErrorCallback[] = [];
	public readonly initialize: Callback[] = [];
	public readonly persist: Callback[] = [];
}
