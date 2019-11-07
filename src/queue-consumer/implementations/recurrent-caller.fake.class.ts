import {IContext} from "../../context-interface";
import {IRecurrentCaller} from "../fifo-queue-consumer-handler.functor";

export class FakeRecurrentCaller implements IRecurrentCaller {

	public called = false;

	public async call(ctx: IContext) {
		this.called = true;
	}
}
