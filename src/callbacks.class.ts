import {Context} from 'aws-lambda';

export type ICallback = (response: unknown, ctx: Context) => (Promise<unknown> | unknown);
export type IErrorCallback = (err: Error, ctx: Context) => (Promise<unknown> | unknown);

export default class Callbacks {
	public readonly flush: ICallback[] = [];
	public readonly handleError: IErrorCallback[] = [];
	public readonly initialize: ICallback[] = [];
	public readonly persist: ICallback[] = [];
}
