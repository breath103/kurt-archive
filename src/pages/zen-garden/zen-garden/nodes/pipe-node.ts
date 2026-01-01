import type { Observable } from "rxjs";

import type { ReactiveNodeContext, ReactiveNodeInputs } from "./node";
import { ReactiveNode } from "./node";

type PipeNodeInputs<T> = { source: T };

export class MapNode<Inputs extends Record<string, unknown>, Output> extends ReactiveNode<Inputs, Output> {
  constructor(
    context: ReactiveNodeContext, 
    inputs: ReactiveNodeInputs<Inputs>,
    readonly name: string,   
    readonly map: (inputs: Inputs) => Output | Observable<Output> | Promise<Output>
  ) {
    super(context, inputs);
  }

  protected process(context: ReactiveNodeContext, inputs: Inputs): Output | Observable<Output> | Promise<Output> {
    return this.map(inputs);
  }

  dispose(): void {}
}

export class PipeNode<T, U> extends ReactiveNode<PipeNodeInputs<T>, U> {
  constructor(
    context: ReactiveNodeContext,
    source: Observable<T>,
    private transform: (value: T) => U,
  ) {
    super(context, { source });
  }

  protected process(_context: ReactiveNodeContext, inputs: PipeNodeInputs<T>): U {
    return this.transform(inputs.source);
  }

  dispose(): void {}
}


export class RxNode<T> extends ReactiveNode<{ source: T }, T> {
  constructor(context: ReactiveNodeContext, source: Observable<T>) {
    super(context, { source });
  }

  protected process(_context: ReactiveNodeContext, inputs: { source: T }): T {
    return inputs.source;
  }

  dispose(): void {}
}

