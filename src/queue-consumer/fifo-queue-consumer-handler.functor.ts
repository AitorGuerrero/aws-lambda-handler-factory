import {IContext} from "../context-interface";
import {PostCallback} from "../decorator.handler-callbacks";

interface IMessage<Id, Body> {
	id: Id;
	body: Body;
}

export interface ICallbacks<MessageBody> {
	flush: Array<PostCallback<void>>;
	onMessageConsumptionError: Array<(e: Error, m: MessageBody) => unknown>;
	onConsumingMessage: Array<(m: MessageBody) => unknown>;
}

export interface IFifoQueueController<MessageId, MessageBody> {
	loadBatch(): Promise<Array<IMessage<MessageId, MessageBody>>>;
	deleteMessages(ids: MessageId[]): Promise<void>;
}

export interface IRecurrentCaller {
	call(ctx: IContext): Promise<void>;
}

export default function buildFifoConsumerHandler<MessageId, MessageBody>(
	processMessage: (message: MessageBody, ctx: IContext) => Promise<unknown>,
	callbacks: ICallbacks<MessageBody>,
	fifoQueueController: IFifoQueueController<MessageId, MessageBody>,
	recurrentCaller: IRecurrentCaller,
	getMessagesRetryMsDelay = 500,
) {

	return async (e: {retryMessagesGet?: boolean}, ctx: any) => {
		const processedMessages: Array<IMessage<MessageId, MessageBody>> = [];
		callbacks.flush.push(() => flush(processedMessages, ctx));
		const messages = await loadMessages(e.retryMessagesGet);
		for (const message of messages) {
			try {
				await callbacks.onConsumingMessage.map((cb) => cb(message.body));
				await processMessage(message.body, ctx);
				processedMessages.push(message);
			} catch (err) {
				await callbacks.onMessageConsumptionError.map((cb) => cb(err, message.body));

				throw err;
			}
		}
	};

	async function flush(processedMessages: Array<IMessage<MessageId, MessageBody>>, ctx: IContext) {
		if (processedMessages.length === 0) {
			return;
		}
		await fifoQueueController.deleteMessages(processedMessages.map((m) => m.id));
		await recurrentCaller.call(ctx);
	}

	async function loadMessages(retry = false) {
		let messages = await fifoQueueController.loadBatch();
		if (retry && messages.length === 0) {
			await new Promise((rs) => setTimeout(rs, getMessagesRetryMsDelay));
			messages = await fifoQueueController.loadBatch();
		}

		return messages;
	}
}
