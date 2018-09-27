/* tslint:disable:no-unused-expression */

import {expect} from "chai";
import {beforeEach, describe} from "mocha";
import {AwsLambdaHandlerFactory, HandlerEventType, LambdaHandler} from "./aws-lambda-handler-factory.class";
import {IContext} from "./context-interface";

const error = "ERROR";

describe("Having a handler factory", () => {
	let handlerFactory: AwsLambdaHandlerFactory;
	const ctx = {
		getRemainingTimeInMillis: () => 0,
	} as IContext;
	beforeEach(() => handlerFactory = new AwsLambdaHandlerFactory());
	it("should call the callback with provided handler response", () => {
		const response = "response";
		let handle: LambdaHandler<any, any>;
		beforeEach(() => handle = handlerFactory.build(() => response));
		it("should call the callback with the response", async () => {
			const handlerResponse = await new Promise((rs, rj) => handle(null, ctx, (err, data) => err ? rj(err) : rs(data)));
			expect(handlerResponse).to.be.equal(response);
		});
	});
	describe("and the handler fails", () => {
		let handle: LambdaHandler<any, any>;
		beforeEach(() => handle = handlerFactory.build(() => Promise.reject(error)));
		it("should emit the error", async () => {
			let emittedErr: any = null;
			handlerFactory.eventEmitter.on("error", (err) => {
				emittedErr = err;
			});
			await new Promise((rs) => handle(null, ctx, (err) => rs(err)));
			await new Promise((rs) => setTimeout(rs, 0)); // enqueue process
			expect(emittedErr).to.be.eq(error);
		});
		describe("and the error event is managed", () => {
			beforeEach(() => handlerFactory.eventEmitter.on("error", () => null));
			it("should call the callback with the error", async () => {
				const err = await new Promise((rs) => handle(null, ctx, (e) => rs(e)));
				expect(err).to.be.eq(error);
			});
			it("should emit finished event", async () => {
				let emittedFinished = false;
				handlerFactory.eventEmitter.on(HandlerEventType.finished, () => emittedFinished = true);
				await new Promise((rs) => handle(null, ctx, (err) => rs(err)));
				await new Promise((rs) => setTimeout(rs, 0)); // enqueue process
				expect(emittedFinished).to.be.true;
			});
		});
	});
});
