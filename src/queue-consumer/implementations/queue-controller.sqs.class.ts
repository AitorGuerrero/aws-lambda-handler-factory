import {SQS} from "aws-sdk";
import {IFifoQueueController} from "../fifo-queue-consumer-handler.functor";

interface IMessageId {
	MessageId: string;
	ReceiptHandle: string;
}

export default class SqsQueueController<Body> implements IFifoQueueController<IMessageId, Body> {

	constructor(
		private sqs: SQS,
		private queueUrl: string,
		private maxNumberOfMessages: number,
	) {}

	public async deleteMessages(ids: IMessageId[]) {
		const response = await new Promise<SQS.Types.DeleteMessageBatchResult>((rs, rj) => this.sqs.deleteMessageBatch({
			Entries: ids.map((b) => ({
				Id: b.MessageId,
				ReceiptHandle: b.ReceiptHandle,
			})),
			QueueUrl: this.queueUrl,
		}, (err, data) => err ? rj(err) : rs(data)));
		if (response.Failed && response.Failed.length > 0) {
			throw new Error("Error deleting some SQS messages");
		}
	}

	public async loadBatch() {
		const response = await new Promise<SQS.ReceiveMessageResult>((rs, rj) => this.sqs.receiveMessage({
			MaxNumberOfMessages: this.maxNumberOfMessages,
			QueueUrl: this.queueUrl,
		}, (err, res) => err ? rj(err) : rs(res)));

		return response.Messages !== undefined ? response.Messages.map((m) => ({
			body: JSON.parse(m.Body),
			id: {MessageId: m.MessageId, ReceiptHandle: m.ReceiptHandle},
		})) : [];
	}
}
