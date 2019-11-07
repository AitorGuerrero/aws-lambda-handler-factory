import {LambdaHandler} from "../handler-factory.class";
import {IApiInput} from "./api-input.interface";
import {ApiHandler} from "./handler-factory.class";
import {IApiOutput} from "./output.interface";

/**
 * A interface to allow object decorator pattern
 */
export interface IAwsLambdaApiHandlerFactory {
	build(apiHandler: ApiHandler): LambdaHandler<IApiInput, IApiOutput>;
}
