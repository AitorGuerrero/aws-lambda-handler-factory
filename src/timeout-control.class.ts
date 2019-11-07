import {EventEmitter} from "events";
import {IContext} from "./context-interface";

export enum TimeoutControlEventType {
	timeOut = "timeOut",
}

export default class TimeoutControl {

	public eventEmitter = new EventEmitter();

	private timer: NodeJS.Timeout;

	constructor(
		ctx: IContext,
		timeOutSecureMarginMs?: number,
	) {
		if (timeOutSecureMarginMs == undefined || ctx.getRemainingTimeInMillis === undefined) {
			return;
		}
		const remainingTime = ctx.getRemainingTimeInMillis() - timeOutSecureMarginMs;
		if (remainingTime <= 0) {
			return;
		}
		this.timer = setTimeout(() => this.eventEmitter.emit(TimeoutControlEventType.timeOut), remainingTime);
	}

	public clear() {
		if (this.timer === undefined) {
			return;
		}
		clearTimeout(this.timer);
		this.timer = undefined;
	}
}
