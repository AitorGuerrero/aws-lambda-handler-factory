import Lambda = require("aws-sdk/clients/lambda");
import {IContext} from "../../context-interface";
import {IRecurrentCaller} from "../fifo-queue-consumer-handler.functor";

export class LambdaRecurrentCaller implements IRecurrentCaller {

	constructor(
		private lambda: Lambda,
	) {}

	public async call(ctx: IContext) {
		await new Promise((rs, rj) => this.lambda.invoke({
			FunctionName: ctx.functionName,
			InvocationType: "Event",
			Payload: JSON.stringify({
				env: {
					awsRequestId: ctx.awsRequestId,
					functionName: ctx.functionName,
					logGroupName: ctx.logGroupName,
					logStreamName: ctx.logStreamName,
				},
				retryMessagesGet: true,
			}),
		}, (err) => err ? rj(err) : rs()));
	}
}
