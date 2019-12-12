import {SQS} from "aws-sdk";

export default class Callbacks {
	public readonly onMessageConsumptionError: Array<(e: Error, m: SQS.Message) => unknown> = [];
	public readonly onConsumingMessage: Array<(m: unknown) => unknown> = [];
}
