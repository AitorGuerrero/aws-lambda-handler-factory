// tslint:disable:no-unused-expression

import {expect} from "chai";
import {EventEmitter} from "events";
import {describe} from "mocha";
import {AsyncLambdaHandler} from "./async-lambda-handler.type";
import {IContext} from "./context-interface";
import {decorateHandler, ICallbacks} from "./decorator.handler";
import {HandlerCustomError} from "./error.handler-custom.class";
import ErrorOcurred from "./event.error.class";
import Flushed from "./event.flushed.class";
import Persisted from "./event.persisted.class";

describe("Decorating a handler", () => {

	let handler: AsyncLambdaHandler<unknown, unknown>;
	let callbacks: ICallbacks<unknown, unknown>;
	let eventEmitter: EventEmitter;
	let ctx: IContext;

	beforeEach(() => {
		callbacks = {
			flush: [],
			handleError: [],
			initialize: [],
			persist: [],
		};
		eventEmitter = new EventEmitter();
		eventEmitter.on(ErrorOcurred.code, () => null);
		ctx = {
			awsRequestId: "",
			functionName: "",
			getRemainingTimeInMillis: () => 0,
			logGroupName: "",
			logStreamName: "",
		};
		handler = async () => null;
	});

	describe("when the handler fails", () => {
		const error = new Error("handler fails");
		beforeEach(() => handler = async () => { throw error; });
		itShouldThrowError(error);
		itShouldNotFlush();
		itShouldEmitError(error);
		it("should not persist", async () => {
			let persist = false;
			callbacks.persist.push(() => persist = true);
			try {
				await decorateHandler(handler, callbacks, eventEmitter)(null, ctx);
				expect.fail("Should fail.");
			} catch (err) {
				expect(persist).to.be.false;
			}
		});
	});
	describe("when the persist fails", () => {
		const error = new Error("persist fails");
		beforeEach(() => callbacks.persist.push(() => { throw error; }));
		itShouldNotFlush();
		itShouldEmitError(error);
		itShouldThrowError(error);
	});
	describe("when the flush fails", () => {
		const error = new Error("flush fails");
		beforeEach(() => callbacks.flush.push(() => { throw error; }));
		it("should persist", async () => {
			let persisted = false;
			callbacks.persist.push(() => persisted = true);
			try {
				await decorateHandler(handler, callbacks, eventEmitter)(null, ctx);
				expect.fail("Should fail");
			} catch (err) {
				expect(persisted).to.be.true;
			}
		});
		itShouldEmitError(error);
		itShouldThrowError(error);
	});
	describe("when the handler returns something", () => {
		const output = "output";
		beforeEach(() => handler = async () => output);
		it("should return handler output", async () => {
			const receivedOutput = await decorateHandler(handler, callbacks, eventEmitter)(null, ctx);
			expect(receivedOutput).to.be.equal(output);
		});
	});
	describe("when the handler receives something", () => {
		const input = "input";
		let receivedInput: string;
		beforeEach(() => handler = async (i) => receivedInput = i as string);
		it("should receive handler input", async () => {
			await decorateHandler(handler, callbacks, eventEmitter)(input, ctx);
			expect(receivedInput).to.be.equal(input);
		});
	});
	describe("when the handler throws a custom response error", () => {
		const expectedResponse = "response";
		const error = new HandlerCustomError(expectedResponse);
		beforeEach(() => handler = async () => { throw error; });
		it("should return the error custom response", async () => {
			const response = await decorateHandler(handler, callbacks, eventEmitter)(null, ctx);
			expect(response).to.be.equal(expectedResponse);
		});
		itShouldEmitError(error);
	});

	it("should emit flushed event once", async () => {
		const emittedEvents: Array<Flushed<unknown>> = [];
		eventEmitter.on(Flushed.code, (e) => emittedEvents.push(e));
		await decorateHandler(handler, callbacks, eventEmitter)(null, ctx);
		expect(emittedEvents).to.be.length(1);
	});

	it("should emit persisted event once", async () => {
		const emittedEvents: Array<Persisted<unknown>> = [];
		eventEmitter.on(Persisted.code, (e) => emittedEvents.push(e));
		await decorateHandler(handler, callbacks, eventEmitter)(null, ctx);
		expect(emittedEvents).to.be.length(1);
	});

	function itShouldNotFlush() {
		it("should not flush", async () => {
			let flushed = false;
			callbacks.flush.push(() => flushed = true);
			try {
				await decorateHandler(handler, callbacks, eventEmitter)(null, ctx);
				expect.fail("Should fail.");
			} catch (err) {
				expect(flushed).to.be.false;
			}
		});
	}

	function itShouldEmitError(error: Error) {
		it("should emit error", async () => {
			let emittedError: ErrorOcurred<unknown>;
			eventEmitter.on(ErrorOcurred.code, (err) => emittedError = err);
			try {
				await decorateHandler(handler, callbacks, eventEmitter)(null, ctx);
				expect.fail("Should fail.");
			} catch (err) {
				expect(emittedError).not.to.be.undefined;
				expect(emittedError).to.be.instanceOf(ErrorOcurred);
				expect(emittedError.error).to.be.eq(error);
			}
		});
	}

	function itShouldThrowError(error: Error) {
		it("should throw error", async () => {
			try {
				await decorateHandler(handler, callbacks, eventEmitter)(null, ctx);
				expect.fail("Should fail.");
			} catch (err) {
				expect(err).equal(error);
			}
		});
	}
});
