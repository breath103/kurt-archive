import type { Observable } from "rxjs";

import type { ReactiveNodeContext } from "./node";
import { ReactiveNode } from "./node";

type PipeNodeInputs<T> = { source: T };

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
