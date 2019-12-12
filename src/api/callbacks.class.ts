export default class Callbacks {
	public readonly onError: Array<(err: Error) => (Promise<any> | any)> = [];
}
