import {SQS} from "aws-sdk";

interface IBasicFakeMessage {
	MessageId: string;
	Body: string;
}

export class FakeSqs {

	private nextId = 0;
	private queues: {
		[name: string]: {
			batches: {
				message: IBasicFakeMessage,
				inFlight: boolean,
				retries: number,
				deleted: boolean,
			}[];
			batchLength: number;
			fifoMode: boolean;
		};
	} = {};

	public receiveMessage(opts: SQS.ReceiveMessageRequest, cb: any) {
		if (this.queues[opts.QueueUrl].fifoMode && this.areInFlightMessages(opts.QueueUrl)) {
			return cb(null, {Messages: []});
		}
		this.queues[opts.QueueUrl].batches
			.filter((m) => m.retries >= 3)
			.filter((m) => m.deleted === false)
			.forEach((m) => m.deleted = true);
		const messages = this.queues[opts.QueueUrl].batches
			.filter((m) => m.deleted === false)
			.filter((m) => m.inFlight === false)
			.slice(0, this.queues[opts.QueueUrl].batchLength);
		messages.forEach((m) => m.inFlight = true);
		messages.forEach((m) => m.retries++);
		cb(null, {Messages: messages.length === 0 ? undefined : messages.map((m) => m.message)});
	}

	public deleteMessageBatch(req: SQS.DeleteMessageBatchRequest, cb: any) {
		for (const m of req.Entries) {
			this.queues[req.QueueUrl].batches.find((n) => m.Id === n.message.MessageId).deleted = true;
		}
		cb(null, {Failed: []});
	}

	public addMessages(queueUrl: string, messages: any[]) {
		this.queues[queueUrl].batches = this.queues[queueUrl].batches
			.concat(messages.map((message) => ({
				deleted: false,
				inFlight: false,
				message: {
					Body: JSON.stringify(message),
					MessageId: String(++this.nextId),
				},
				retries: 0,
			})));
	}

	public addQueue(queueUrl: string, fifoMode = false, batchLength = 3) {
		this.queues[queueUrl] = {batches: [], fifoMode, batchLength};
	}

	public resetInFlight(queueUrl: string) {
		return this.queues[queueUrl].batches.map((m) => m.inFlight = false);
	}

	public getAvailableMessages(queueUrl: string) {
		return this.queues[queueUrl].batches
			.filter((m) => m.deleted === false)
			.filter((m) => m.inFlight === false);
	}

	private areInFlightMessages(queueUrl: string) {
		return this.queues[queueUrl].batches.filter((m) => m.deleted === false).find((m) => m.inFlight);
	}
}
