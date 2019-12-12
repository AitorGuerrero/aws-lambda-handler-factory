import IContext from "./context-interface";

export type ICallback = (response: unknown, ctx: IContext) => (Promise<unknown> | unknown);
export type IErrorCallback = (err: Error, ctx: IContext) => (Promise<unknown> | unknown);

export default class Callbacks {
	public readonly flush: ICallback[] = [];
	public readonly handleError: IErrorCallback[] = [];
	public readonly initialize: ICallback[] = [];
	public readonly persist: ICallback[] = [];
}
