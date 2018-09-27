import {expect} from "chai";
import {beforeEach, describe} from "mocha";
import {AwsLambdaHandlerFactory, LambdaHandler} from "../aws-lambda-handler-factory.class";
import {IContext} from "../context-interface";
import {AwsLambdaApiHandlerFactory} from "./handler-factory.class";
import {IAwsLambdaApiHandlerFactory} from "./handler-factory.interface";
import {HeadersDecorator} from "./headers.decorator";

describe("Having api factory with custom headers", () => {

	const myHeader = "myHeader";
	const ctx = {getRemainingTimeInMillis: () => 0} as IContext;

	let factory: AwsLambdaHandlerFactory;
	let apiFactory: IAwsLambdaApiHandlerFactory;
	let handle: LambdaHandler<any, any>;

	beforeEach(() => {
		factory = new AwsLambdaHandlerFactory();
		apiFactory = new HeadersDecorator(new AwsLambdaApiHandlerFactory(factory), {myHeader});
		handle = apiFactory.build(() => null);
	});
	it("should return cors headers", async () => {
		const response = await asyncHandler(handle)(null, ctx);
		expect(response.headers.myHeader).to.be.eq(myHeader);
	});
});

function asyncHandler<I, O>(handler: LambdaHandler<I, O>) {
	return (input: I, ctx: IContext) =>
		new Promise<O>((rs, rj) => handler(input, ctx, (err, data) => err ? rj(err) : rs(data)));
}
