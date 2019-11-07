import {IContext} from "./context-interface";

export type AsyncLambdaHandler<Input, Output> = (input: Input, ctx: IContext) => Promise<Output>;
