import {SQS} from "aws-sdk";
import {clearTimeout, setTimeout} from "timers";
import {AwsLambdaHandlerFactory} from "../aws-lambda-handler-factory.class";
import {IContext} from "../context-interface";

export class SqsConsumerHandlerFactory {

	public readonly callbacks: {
		onInitBatchProcess: () => Promise<any>
		onBatchProcessed(): Promise<any>
		onMessageError(message: any, err: Error): Promise<any>,
	};

	public timeOutSecureMargin = 10000;
	private currentMessage: SQS.Message;
	private batch: SQS.Message[] = [];
	private sourceClean = false;
	private timedOut = false;
	private processedMessages: SQS.Message[] = [];
	private timer: any;
	private queueUrl: string;

	constructor(
		private handlerFactory: AwsLambdaHandlerFactory,
		private sqs: SQS,
		callbacks?: {
			onInitBatchProcess?(): Promise<any>
			onBatchProcessed?(): Promise<any>
			onMessageError?(message: any, err: Error): Promise<any>,
		},
	) {
		this.callbacks = Object.assign({
			onBatchProcessed: () => Promise.resolve(),
			onInitBatchProcess: () => Promise.resolve(),
			onMessageError: () => Promise.resolve(),
		}, callbacks || {});
	}

	public build<Message>(
		queueUrl: string,
		processMessages: (nextMessage: () => Promise<Message>, ctx: IContext) => Promise<any>,
	)  {
		return this.handlerFactory.build(async (e: any, ctx: IContext) => {
			this.queueUrl = queueUrl;
			this.reset(ctx);
			this.processedMessages = [];
			while (this.timeLimitHasNotReached() && !this.allProcessed()) {
				await this.callbacks.onInitBatchProcess();
				try {
					await processMessages(async () => this.nextMessage<Message>(), ctx);
					this.moveCurrentMessageToProcessed();
					await this.callbacks.onBatchProcessed();
				} catch (error) {
					this.currentMessage = undefined;
					await this.callbacks.onMessageError(this.currentMessage, error);
					continue;
				}
				await this.deleteSqsMessages(queueUrl, this.processedMessages);
			}
			if (this.timer) {
				clearTimeout(this.timer);
			}
		});
	}

	private reset(ctx: IContext) {
		this.batch = [];
		this.processedMessages = [];
		this.timedOut = false;
		this.sourceClean = false;
		this.currentMessage = undefined;
		if (this.timer) {
			clearTimeout(this.timer);
		}
		this.controlTimeOut(ctx);
	}

	private allProcessed() {
		return this.sourceClean && this.batch.length === 0;
	}

	private moveCurrentMessageToProcessed() {
		if (this.currentMessage) {
			this.processedMessages.push(this.currentMessage);
			this.currentMessage = undefined;
		}
	}

	private timeLimitHasNotReached() {
		return !this.timedOut;
	}

	private async nextMessage<Message>() {
		this.moveCurrentMessageToProcessed();
		let sqsMessage: SQS.Message;
		let event: Message;
		if (this.timedOut) {
			return;
		}
		sqsMessage = await this.nextSqsMessage();
		if (sqsMessage === undefined) {
			return;
		}
		this.currentMessage = sqsMessage;
		event = JSON.parse(sqsMessage.Body);

		return event;
	}

	private async deleteSqsMessages(sqsQueueUrl: string, sqsMessages: SQS.Message[]) {
		const chunk = 10;
		for (let i = 0,  j = sqsMessages.length; i * chunk < j; i++) {
			const batch =  sqsMessages.slice(i * chunk, (i * chunk) + chunk - 1);
			await new Promise((rs, rj) => this.sqs.deleteMessageBatch({
				Entries: batch.map((m) => ({Id: m.MessageId, ReceiptHandle: m.ReceiptHandle})),
				QueueUrl: sqsQueueUrl,
			}, (err) => err ? rj(err) : rs(err)));
		}
	}

	private async nextSqsMessage() {
		if (this.batch.length === 0) {
			this.batch = await this.loadBatch();
		}
		if (this.allProcessed()) {
			return;
		}

		return this.batch.shift();
	}

	private async loadBatch() {
		if (this.allProcessed()) {
			return [];
		}
		const response = await new Promise<SQS.ReceiveMessageResult>((rs, rj) => this.sqs.receiveMessage({
			MaxNumberOfMessages: 10,
			QueueUrl: this.queueUrl,
		}, (err, res) => err ? rj(err) : rs(res)));
		if (response.Messages === undefined) {
			this.sourceClean = true;
		}

		return response.Messages || [];
	}

	private controlTimeOut(ctx: IContext) {
		const remainingTime = ctx.getRemainingTimeInMillis() - this.timeOutSecureMargin;
		if (remainingTime <= 0) {
			return;
		}
		this.timer = setTimeout(() => this.timedOut = true, remainingTime);
	}
}
