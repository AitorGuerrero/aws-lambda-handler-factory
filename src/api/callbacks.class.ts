export default class Callbacks {
	public readonly onError: ((err: Error) => (Promise<any> | any))[] = [];
}
