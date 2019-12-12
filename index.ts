import * as api from "./src/api";
import AwsLambdaHandlerFactory from "./src/handler-factory.class";
import * as sqsConsumer from "./src/sqs-consumer";

export default AwsLambdaHandlerFactory;

export * from "./src";
export {api, sqsConsumer};
