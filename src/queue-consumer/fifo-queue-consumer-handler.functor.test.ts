// tslint:disable:no-unused-expression
import {expect} from "chai";
import {beforeEach, describe, it} from "mocha";
import {IContext} from "../context-interface";
import buildFifoConsumerHandler, {ICallbacks} from "./fifo-queue-consumer-handler.functor";
import InMemoryQueueController from "./implementations/queue-controller.in-memory.class";
import {FakeRecurrentCaller} from "./implementations/recurrent-caller.fake.class";

describe("Building a queue consumer handler functor", () => {

	let queueController: InMemoryQueueController<unknown, unknown>;
	let processMessage: (message: unknown, ctx: IContext) => Promise<unknown>;
	let callbacks: ICallbacks<unknown>;
	let recurrentCaller: FakeRecurrentCaller;
	let input: {retryMessagesGet?: boolean};

	beforeEach(() => {
		processMessage = async () => null;
		recurrentCaller = new FakeRecurrentCaller();
		queueController = new InMemoryQueueController();
		input = {};
		callbacks = {flush: [], onConsumingMessage: [], onMessageConsumptionError: []};
	});
	describe("having a message in the queue", () => {
		beforeEach(() => queueController.publish("messageId", "messageBody"));
		describe("and message processor fails", () => {
			const error = new Error("processing message error");
			beforeEach(() => processMessage = () => { throw error; });
			it("should not remove the message from the queue", async () => {
				try {
					await executeHandler();
					expect.fail();
				} catch (err) {
					expect(queueController.queue.length).to.be.eq(1);
				}
			});
			it("should throw the error", async () => {
				try {
					await executeHandler();
					expect.fail();
				} catch (err) {
					expect(err).to.be.eq(error);
				}
			});
			it("should call the error callback", async () => {
				let emittedError: Error;
				callbacks.onMessageConsumptionError.push((err) => emittedError = err);
				try {
					await executeHandler();
					expect.fail();
				} catch (err) {
					expect(emittedError).to.be.eq(error);
				}
			});
		});
		it("should remove the message from the queue", async () => {
			await executeHandler();
			expect(queueController.queue.length).to.be.equal(0);
		});
		it("should call recursively", async () => {
			await executeHandler();
			expect(recurrentCaller.called).to.be.true;
		});
	});
	describe("having more messages than queueController max batch amount", () => {
		const totalMessagesAmount = 3;
		const batchSize = 2;
		beforeEach(() => {
			for (let i = 0; i < totalMessagesAmount; i++) {
				queueController.publish(i, `message${i}`);
			}
			queueController.batchSize = batchSize;
		});
		it("should left other messages than the batched ones", async () => {
			await executeHandler();
			expect(queueController.queue.length).to.be.equal(totalMessagesAmount - batchSize);
		});
	});
	describe("not having messages in the queue", () => {
		beforeEach(() => queueController.clear());
		describe("and asking for retry the pull", () => {
			beforeEach(() => input.retryMessagesGet = true);
			it("should ask fro messages twice", async () => {
				await executeHandler();
				expect(queueController.loadBatchCalled).to.be.equal(2);
			});
		});
		it("should not call recursively", async () => {
			await executeHandler();
			expect(recurrentCaller.called).to.be.false;
		});
		it("should ask fro messages once", async () => {
			await executeHandler();
			expect(queueController.loadBatchCalled).to.be.equal(1);
		});
	});
	function buildHandler() {
		return buildFifoConsumerHandler(processMessage, callbacks, queueController, recurrentCaller, 100);
	}
	async function flush(response: unknown) {
		await Promise.all(callbacks.flush.map((cb) => cb(response as void, null)));
	}
	async function executeHandler() {
		const response = await buildHandler()(input, {});
		await flush(response);

		return response;
	}
});
