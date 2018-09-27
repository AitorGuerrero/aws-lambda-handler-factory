/**
 * This is the AWS Lambda context object
 * For more info:
 * https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 */
export interface IContext {
	done: () => void;
	succeed: () => void;
	fail: () => void;
	logGroupName: string;
	logStreamName: string;
	functionName: string;
	memoryLimitInMB: string;
	functionVersion: string;
	getRemainingTimeInMillis: () => number;
	invokeid: string;
	awsRequestId: string;
	invokedFunctionArn: string;
}
