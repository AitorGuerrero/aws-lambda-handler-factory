import {SQS} from "aws-sdk";

export default class Callbacks {
	public readonly onMessageConsumptionError: ((e: Error, m: SQS.Message) => unknown)[] = [];
	public readonly onConsumingMessage: ((m: unknown) => unknown)[] = [];
}
