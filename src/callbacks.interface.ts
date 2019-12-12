import IContext from "./context-interface";

export type ICallback = (response: unknown, ctx: IContext) => (Promise<unknown> | unknown);
export type IErrorCallback = (err: Error, ctx: IContext) => (Promise<unknown> | unknown);

export default interface ICallbacks {
	flush: ICallback[];
	handleError: IErrorCallback[];
	initialize: ICallback[];
	persist: ICallback[];
}
