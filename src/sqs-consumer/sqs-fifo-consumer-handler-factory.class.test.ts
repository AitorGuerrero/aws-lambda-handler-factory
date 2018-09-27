import {expect} from "chai";
import {beforeEach, describe} from "mocha";
import {AwsLambdaHandlerFactory} from "../aws-lambda-handler-factory.class";
import {SqsFifoConsumerHandlerFactory} from "./sqs-fifo-consumer-handler-factory.class";

class FakeSqs {
	public batches: Array<{ReceiptHandle: string, Body: string}> = [];
	private processingMessages: any[] = [];

	public receiveMessage(opts: any, cb: any) {
		if (this.processingMessages.length > 0) {
			return cb(null, {Messages: []});
		}
		this.processingMessages = this.batches.slice(0, 3);
		cb(null, {Messages: this.processingMessages});
	}

	public deleteMessageBatch(req: {Entries: Array<{ReceiptHandle: string, Id: string}>}, cb: any) {
		for (const m of req.Entries) {
			this.deleteMessage(m);
		}
		cb(null, {Failed: []});
	}

	private deleteMessage(m: {ReceiptHandle: string, Id: string}) {
		const i = this.batches.findIndex((j) => j.ReceiptHandle === m.ReceiptHandle);
		this.batches.splice(i, i + 1);
		const i2 = this.processingMessages.findIndex((j) => j.ReceiptHandle === m.ReceiptHandle);
		this.processingMessages.splice(i2, i2 + 1);
	}
}

describe("having a sqs fifo consumer handler factory", () => {

	let factory: SqsFifoConsumerHandlerFactory<any>;
	let factoryBase: AwsLambdaHandlerFactory;
	let sqs: FakeSqs;

	beforeEach(() => {
		sqs = new FakeSqs();
		factoryBase = new AwsLambdaHandlerFactory();
		factory = new SqsFifoConsumerHandlerFactory<any>(
			"queueUrl",
			sqs as any,
			factoryBase,
		);
	});

	describe("having 6 messages batch and loading batches of 3 messages", () => {
		beforeEach(() => {
			sqs.batches.push(
				{ReceiptHandle: "M-1", Body: "1"},
				{ReceiptHandle: "M-2", Body: "2"},
				{ReceiptHandle: "M-3", Body: "3"},
				{ReceiptHandle: "M-4", Body: "4"},
				{ReceiptHandle: "M-5", Body: "5"},
				{ReceiptHandle: "M-6", Body: "6"},
			);
		});
		it("should process all the messages", async () => {
			const processedMessages: number[] = [];
			await new Promise((rs, rj) => factory.build(async (next) => {
				let item;
				while (item = await next()) {
					processedMessages.push(item);
				}
			})(null, {} as any, (err) => err ? rj(err) : rs()));
			expect(processedMessages.length).to.be.eq(6);
			expect(processedMessages[0]).to.be.eq(1);
			expect(processedMessages[1]).to.be.eq(2);
			expect(processedMessages[2]).to.be.eq(3);
			expect(processedMessages[3]).to.be.eq(4);
			expect(processedMessages[4]).to.be.eq(5);
			expect(processedMessages[5]).to.be.eq(6);
		});
		it("should delete all the messages", async () => {
			await new Promise((rs, rj) => factory.build(async (next) => {
				let item = await next();
				while (item !== undefined) {
					item = await next();
				}
			})(null, {} as any, (err) => err ? rj(err) : rs()));
			expect(sqs.batches.length).to.be.eq(0);
		});
		describe("and the fifth message failed", () => {
			it("should process first 4 messages", async () => {
				const processedMessages: number[] = [];
				await new Promise((rs, rj) => factory.build(async (next) => {
					let item;
					while (item = await next()) {
						if (item === 5) {
							throw new Error("5th message failed");
						}
						processedMessages.push(item);
					}
				})(null, {} as any, (err) => err ? rj(err) : rs()));
				expect(processedMessages.length).to.be.eq(5);
				expect(processedMessages[0]).to.be.eq(1);
				expect(processedMessages[1]).to.be.eq(2);
				expect(processedMessages[2]).to.be.eq(3);
				expect(processedMessages[3]).to.be.eq(4);
				expect(processedMessages[4]).to.be.eq(4);
			});
		});
		describe("and the callback process only one message by call", () => {
			it("should process all the messages", async () => {
				const processedMessages: number[] = [];
				await new Promise((rs, rj) => factory.build(async (next) => {
					const item = await next();
					processedMessages.push(item);
				})(null, {} as any, (err) => err ? rj(err) : rs()));
				expect(processedMessages.length).to.be.eq(6);
				expect(processedMessages[0]).to.be.eq(1);
				expect(processedMessages[1]).to.be.eq(2);
				expect(processedMessages[2]).to.be.eq(3);
				expect(processedMessages[3]).to.be.eq(4);
				expect(processedMessages[4]).to.be.eq(5);
				expect(processedMessages[5]).to.be.eq(6);
			});
			it("should delete all the messages", async () => {
				await new Promise((rs, rj) => factory
					.build(async (next) => await next())
					(null, {} as any, (err) => err ? rj(err) : rs()));
				expect(sqs.batches.length).to.be.eq(0);
			});
		});
	});
});
