import {IFifoQueueController} from "../fifo-queue-consumer-handler.functor";

export default class InMemoryQueueController<I, M> implements IFifoQueueController<I, M> {

	public batchSize = 2;
	public loadBatchCalled = 0;

	public queue: Array<{id: I, body: M}> = [];
	private current: Array<{id: I, body: M}> = [];

	public async deleteMessages(ids: I[]) {
		for (const id of ids) {
			const indexInCurrent = this.current.findIndex((i) => i.id === id);
			if (indexInCurrent === -1) {
				throw new Error("The id is not in loaded batch");
			}
			this.current = [...this.current.slice(0, indexInCurrent), ...this.current.slice(indexInCurrent + 1)];
			const indexInQueue = this.queue.findIndex((i) => i.id === id);
			this.queue = [...this.queue.slice(0, indexInQueue), ...this.queue.slice(indexInQueue + 1)];
		}
	}

	public async loadBatch() {
		this.loadBatchCalled++;
		if (this.current.length > 0) {
			return [];
		}
		this.current = this.queue.slice(0, this.batchSize);

		return [...this.current];
	}

	public publish(id: I, body: M) {
		this.queue.push({id, body});
	}

	public clear() {
		this.queue = [];
		this.current = [];
	}
}
