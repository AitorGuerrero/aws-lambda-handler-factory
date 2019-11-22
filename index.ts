/* tslint:disable:import-spacing */
import {decorateHandler, ICallbacks as IDecoratorHandlerCallbacks} from "./src/decorator.handler";
import {decorateHandlerWithCallbacks, ErrorCallback, ICallbacks, PostCallback, PreCallback}
	from "./src/decorator.handler-callbacks";
import decorateHandlerWithCustomError from "./src/decorator.handler-custom-error";
import decorateHandlerWithErrorMiddleware from "./src/decorator.handler-error-middleware";
import decorateHandlerWithLifeCycleEventsEmitter from "./src/decorator.handler-life-cycle-events-emissor";
import decorateHandlerWithOutputMiddleware from "./src/decorator.handler-response-middleware";
import decorateHandlerWithTimeoutControl from "./src/decorator.handler-timeout-control";
import ErrorOcurred from "./src/event.error.class";
import Flushed from "./src/event.flushed.class";
import Initialized from "./src/event.init.class";
import InitializingFlush from "./src/event.initializing-flush.class";
import Persisted from "./src/event.persisted.class";
import Succeeded from "./src/event.success.class";
import TimeoutReached from "./src/event.timeout.class";
import decorateHttpApiHandlerWithHttpApiLogic from "./src/http-api/decorator.api-handler";
import ApiRequestFailed from "./src/http-api/error.api-request.class";
import ApiSystemFailed from "./src/http-api/error.api-system.class";
import ApiRequestNotFound from "./src/http-api/error.not-found.class";
import ApiRequestUnauthorized from "./src/http-api/error.unauthorized.class";
import ApiUnprocessableEntity from "./src/http-api/error.unprocessable-entity.class";
import ApiSucceeded from "./src/http-api/event.api-success.class";
import buildMultiEndpointHttpApiLambdaHandler from "./src/http-api/functor.api-multi-endpoint";
import buildHttpApiLambdaProxyHandler from "./src/http-api/functor.proxy-api-handler";
import buildFifoConsumerHandler, {
	ICallbacks as IFifoQueueConsumerHandlerCallbacks,
	IFifoQueueController,
	IRecurrentCaller,
}
	from "./src/queue-consumer/fifo-queue-consumer-handler.functor";
import SqsFifoQueueController from "./src/queue-consumer/implementations/queue-controller.sqs.class";
import {LambdaRecurrentCaller} from "./src/queue-consumer/implementations/recurrent-caller.lambda.class";

export {
	decorateHandler,
	decorateHandlerWithCallbacks,
	decorateHandlerWithCustomError,
	decorateHandlerWithErrorMiddleware,
	decorateHandlerWithLifeCycleEventsEmitter,
	decorateHandlerWithOutputMiddleware,
	decorateHandlerWithTimeoutControl,
	decorateHttpApiHandlerWithHttpApiLogic,
	buildHttpApiLambdaProxyHandler,
	buildMultiEndpointHttpApiLambdaHandler,
	buildFifoConsumerHandler,
	ApiRequestFailed,
	ApiSystemFailed,
	ApiRequestNotFound,
	ApiRequestUnauthorized,
	ApiUnprocessableEntity,
	ApiSucceeded,
	ErrorOcurred,
	Flushed,
	Initialized,
	Persisted,
	Succeeded,
	TimeoutReached,
	InitializingFlush,
	IDecoratorHandlerCallbacks,
	IFifoQueueConsumerHandlerCallbacks,
	ICallbacks,
	IRecurrentCaller,
	IFifoQueueController,
	PreCallback,
	PostCallback,
	ErrorCallback,
	SqsFifoQueueController,
	LambdaRecurrentCaller,
};
