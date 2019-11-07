/**
 * This is the AWS Lambda context object
 * For more info:
 * https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 */
export interface IContext {
	logGroupName: string;
	logStreamName: string;
	functionName: string;
	getRemainingTimeInMillis: () => number;
	awsRequestId: string;
}
