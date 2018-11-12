import {SQS} from "aws-sdk";
import {expect} from "chai";
import {FakeSqs} from "../../helpers/fake-sqs.class";
import {AwsLambdaHandlerFactory} from "../aws-lambda-handler-factory.class";
import {SqsConsumerHandlerFactory} from "./sqs-consumer-handler-factory.class";

describe("Having a sqs consumer", () => {

	const queueName = "queueName";
	const ctx = {getRemainingTimeInMillis: () => Infinity};

	let factory: SqsConsumerHandlerFactory;
	let factoryBase: AwsLambdaHandlerFactory;
	let sqs: FakeSqs;

	beforeEach(() => {
		factoryBase = new AwsLambdaHandlerFactory();
		sqs = new FakeSqs();
		factory = new SqsConsumerHandlerFactory(
			factoryBase,
			sqs as any as  SQS,
		);
	});

	describe("having 6 messages batch and loading batches of 3 messages", () => {
		beforeEach(() => {
			sqs.addQueue(queueName);
			sqs.addMessages(queueName, [1, 2, 3, 4, 5, 6]);
		});
		it("should process all the messages", async () => {
			const processedMessages: number[] = [];
			await new Promise((rs, rj) => factory.build<number>(queueName, async (next) => {
				let item;
				while (item = await next()) {
					processedMessages.push(item);
				}
			})(null, {
				getRemainingTimeInMillis: () => 2000,
			} as any, (err) => err ? rj(err) : rs()));
			expect(processedMessages.length).to.be.eq(6);
			expect(processedMessages[0]).to.be.eq(1);
			expect(processedMessages[1]).to.be.eq(2);
			expect(processedMessages[2]).to.be.eq(3);
			expect(processedMessages[3]).to.be.eq(4);
			expect(processedMessages[4]).to.be.eq(5);
			expect(processedMessages[5]).to.be.eq(6);
		});
		it("should delete all the messages", async () => {
			await new Promise((rs, rj) => factory.build(queueName, async (next) => {
				let item: any;
				do {
					item = await next();
				} while (item !== undefined);
			})(null, ctx as any, (err) => err ? rj(err) : rs()));
			expect(sqs.getAvailableMessages(queueName).length).to.be.eq(0);
		});
		describe("and the second message fails", () => {
			it("should remove all messages except the second", async () => {
				await new Promise((rs, rj) => factory.build(queueName, async (next) => {
					let item: any;
					do {
						item = await next();
						if (item === 2) {
							throw new Error();
						}
					} while (item !== undefined);
				})(null, ctx as any, (err) => err ? rj(err) : rs()));
				sqs.resetInFlight(queueName);
				const availableMessages = sqs.getAvailableMessages(queueName);
				expect(availableMessages.length).to.be.eq(1);
				expect(availableMessages[0].message.Body).to.be.eq("2");
			});
		});
	});
});
