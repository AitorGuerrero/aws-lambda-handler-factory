import {SQS} from "aws-sdk";
import {AwsLambdaHandlerFactory, handlerEventType} from "../aws-lambda-handler-factory.class";
import {IContext} from "../context-interface";

export class SqsFifoConsumerHandlerFactory<Message> {

	public readonly callbacks: {
		onInitBatchProcess: () => any
		onMessageConsumptionError: (e: Error, m: SQS.Message) => any,
		onBatchProcessed(batch: SQS.Message[]): any
		onConsumingMessage(m: Message): any,
	} = {
		onBatchProcessed: () => Promise.resolve(),
		onConsumingMessage: () => Promise.resolve(),
		onInitBatchProcess: () => Promise.resolve(),
		onMessageConsumptionError: () => Promise.resolve(),
	};

	private currentMessage: SQS.Message;
	private processedMessages: SQS.Message[];
	private messagesBatch: SQS.MessageList;
	private timedOut: boolean;
	private ctx: IContext;

	constructor(
		private queueUrl: string,
		private sqs: SQS,
		private handlerFactory: AwsLambdaHandlerFactory,
	) {
		handlerFactory.eventEmitter.on(handlerEventType.timeOut, () => this.timedOut = true);
		this.processedMessages = [];
	}

	public build(
		processMessages: (nextMessage: () => Promise<Message>, ctx: IContext) => Promise<any>,
	)  {
		return this.handlerFactory.build(async (e: any, ctx: any) => {
			this.ctx = ctx;
			this.timedOut = false;
			this.processedMessages = [];
			await this.loadBatch();
			while (!this.timedOut && this.messagesBatch.length !== 0) {
				await this.callbacks.onInitBatchProcess();
				while (!this.timedOut && this.messagesBatch.length !== 0) {
					try {
						await processMessages(async () => this.nextMessage(), ctx);
					} catch (err) {
						await this.callbacks.onMessageConsumptionError(err, this.currentMessage);
						await this.tryExecutingMessagesToFailedMessage(ctx, processMessages);
					}
					if (this.currentMessage) {
						this.processedMessages.push(this.currentMessage);
						this.currentMessage = undefined;
					}
				}
				await this.callbacks.onBatchProcessed(this.processedMessages);
				await this.deleteProcessedMessages();
				await this.loadBatch();
			}
		});
	}

	private async tryExecutingMessagesToFailedMessage(
		ctx: IContext,
		processMessages: (nextMessage: () => Promise<Message>, ctx: IContext) => Promise<any>,
	) {
		this.messagesBatch = this.processedMessages;
		this.processedMessages = [];
		this.currentMessage = undefined;
		await Promise.all(this.handlerFactory.callbacks.onInit.map((c) => c(null, ctx)));
		await processMessages(async () => this.nextMessage(), this.ctx);
	}

	private async nextMessage() {
		if (this.timedOut) {
			return;
		}
		let event: Message;
		if (this.currentMessage) {
			this.processedMessages.push(this.currentMessage);
		}
		this.currentMessage = this.messagesBatch.shift();
		if (this.currentMessage === undefined) {
			return;
		}
		event = JSON.parse(this.currentMessage.Body);
		await this.callbacks.onConsumingMessage(event);

		return event;
	}

	private async deleteProcessedMessages() {
		const chunk = 10;
		for (let i = 0,  j = this.processedMessages.length; i < j; i += chunk) {
			const batch =  this.processedMessages.slice(i, i + chunk);
			const response = await new Promise<SQS.Types.DeleteMessageBatchResult>((rs, rj) => this.sqs.deleteMessageBatch({
				Entries: batch.map((b) => ({
					Id: b.MessageId,
					ReceiptHandle: b.ReceiptHandle,
				})),
				QueueUrl: this.queueUrl,
			}, (err, data) => err ? rj(err) : rs(data)));
			if (response.Failed && response.Failed.length > 0) {
				throw new Error("Error deleting some SQS messages");
			}
		}
		this.processedMessages = [];
	}

	private async loadBatch() {
		const response = await new Promise<SQS.ReceiveMessageResult>((rs, rj) => this.sqs.receiveMessage({
			MaxNumberOfMessages: 10,
			QueueUrl: this.queueUrl,
		}, (err, res) => err ? rj(err) : rs(res)));

		return this.messagesBatch = response.Messages !== undefined ? response.Messages : [];
	}
}
