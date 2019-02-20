import {Lambda, SQS} from "aws-sdk";
import {IContext} from "../context-interface";
import {AwsLambdaHandlerFactory} from "../handler-factory.class";

export class SqsFifoConsumerHandlerFactory<Message> {

	public readonly callbacks: {
		onInitBatchProcess: Array<() => unknown>,
		onMessageConsumptionError: Array<(e: Error, m: SQS.Message) => unknown>,
		onBatchProcessed: Array<(batch: SQS.Message[]) => unknown>,
		onConsumingMessage: Array<(m: Message) => unknown>,
	} = {
		onBatchProcessed: [],
		onConsumingMessage: [],
		onInitBatchProcess: [],
		onMessageConsumptionError: [],
	};

	private processedMessages: SQS.Message[];
	private ctx: IContext;

	constructor(
		private queueUrl: string,
		private sqs: SQS,
		private lambda: Lambda,
		private handlerFactory: AwsLambdaHandlerFactory,
	) {
		handlerFactory.callbacks.flush.push(() => this.flush());
		handlerFactory.callbacks.initialize.push((() => this.processedMessages = []));
	}

	public build(
		processMessage: (message: Message, ctx: IContext) => Promise<any>,
	)  {
		return this.handlerFactory.build(async (e: any, ctx: any) => {
			this.ctx = ctx;
			const messages = await this.loadBatch();
			for (const message of messages) {
				await processMessage(JSON.parse(message.Body), ctx);
				this.processedMessages.push(message);
			}
		});
	}

	private async deleteProcessedMessages() {
		const response = await new Promise<SQS.Types.DeleteMessageBatchResult>((rs, rj) => this.sqs.deleteMessageBatch({
			Entries: this.processedMessages.map((b) => ({
				Id: b.MessageId,
				ReceiptHandle: b.ReceiptHandle,
			})),
			QueueUrl: this.queueUrl,
		}, (err, data) => err ? rj(err) : rs(data)));
		if (response.Failed && response.Failed.length > 0) {
			throw new Error("Error deleting some SQS messages");
		}
	}

	private async loadBatch() {
		const response = await new Promise<SQS.ReceiveMessageResult>((rs, rj) => this.sqs.receiveMessage({
			QueueUrl: this.queueUrl,
		}, (err, res) => err ? rj(err) : rs(res)));

		return response.Messages !== undefined ? response.Messages : [];
	}

	private callContinue() {
		return new Promise((rs, rj) => this.lambda.invokeAsync({
			FunctionName: this.ctx.functionName,
			InvokeArgs: "",
		}, (err) => err ? rj(err) : rs()));
	}

	private async flush() {
		if (this.processedMessages.length === 0) {
			return;
		}
		await this.deleteProcessedMessages();
		await this.callContinue();
	}
}
