/**
 * This is the AWS Lambda context object
 * For more info:
 * https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 */
export default interface IContext {
	done: () => void;
	succeed: () => void;
	fail: () => void;
	logGroupName: string;
	logStreamName: string;
	functionName: string;
	memoryLimitInMB: string;
	functionVersion: string;
	invokeid: string;
	awsRequestId: string;
	invokedFunctionArn: string;
	getRemainingTimeInMillis?: () => number;
}
