import {expect} from "chai";
import {beforeEach, describe} from "mocha";
import {FakeSqs} from "../../helpers/fake-sqs.class";
import {AwsLambdaHandlerFactory} from "../aws-lambda-handler-factory.class";
import {SqsFifoConsumerHandlerFactory} from "./sqs-fifo-consumer-handler-factory.class";

describe("Having a sqs fifo consumer handler factory", () => {

	const queueUrl = "queueUrl";

	let factory: SqsFifoConsumerHandlerFactory<any>;
	let factoryBase: AwsLambdaHandlerFactory;
	let sqs: FakeSqs;

	beforeEach(() => {
		sqs = new FakeSqs();
		factoryBase = new AwsLambdaHandlerFactory();
		factory = new SqsFifoConsumerHandlerFactory<any>(
			queueUrl,
			sqs as any,
			factoryBase,
		);
	});

	describe("having 6 messages batch and loading batches of 3 messages", () => {
		beforeEach(() => {
			sqs.addQueue(queueUrl, true);
			sqs.addMessages(queueUrl, [1, 2, 3, 4, 5, 6]);
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
			expect(sqs.getAvailableMessages(queueUrl).length).to.be.eq(0);
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
				expect(sqs.getAvailableMessages(queueUrl).length).to.be.eq(0);
			});
		});
	});
});
