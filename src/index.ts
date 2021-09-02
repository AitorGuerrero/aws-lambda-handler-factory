import { AsyncHandler, Handler, SyncHandler } from './aws-lambda-handler';
import Callbacks, { Callback, ErrorCallback } from './callbacks.class';
import HandlerCustomError from './error.handler-custom.class';
import AwsLambdaHandlerFactory, { handlerEventType } from './handler-factory.class';

export * as api from './api';

export {
	Handler,
	AsyncHandler,
	SyncHandler,
	AwsLambdaHandlerFactory,
	Callbacks,
	Callback,
	ErrorCallback,
	HandlerCustomError,
	handlerEventType,
};

export default AwsLambdaHandlerFactory;
