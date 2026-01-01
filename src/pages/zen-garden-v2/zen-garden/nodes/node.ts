import { combineLatest, from, isObservable, Observable, of, shareReplay, switchMap } from "rxjs";
import { type WebGLRenderer } from "three";

// Global values that will not change. if anything that can and will change, do not use this
export interface ReactiveNodeContext {
  textureRenderer: WebGLRenderer // renderer we use for sub rendering passes 
}

export abstract class ReactiveNode<Inputs extends Record<string, unknown>, Output>
  extends Observable<Output>
  implements Disposable
{
  public debugLogInputChanges = true;
  private prevValues: Inputs | null = null;

  // Debug: store inputs for graph traversal
  readonly debugInputs: Map<string, Observable<unknown>>;
  // Debug: marker to identify ReactiveNode instances
  readonly isReactiveNode = true as const;

  constructor(context: ReactiveNodeContext, inputs: ReactiveNodeInputs<Inputs>) {
    const keys = Object.keys(inputs) as (keyof Inputs)[];
    const observables = keys.map(k => inputs[k]);

    // Store inputs for debug traversal
    const inputMap = new Map<string, Observable<unknown>>();
    for (const key of keys) {
      inputMap.set(String(key), inputs[key] as Observable<unknown>);
    }

    const source$ = combineLatest(observables).pipe(
      switchMap((values) => {
        const named = Object.fromEntries(keys.map((k, i) => [k, values[i]])) as Inputs;

        if (this.debugLogInputChanges) {
          const className = this.constructor.name;
          if (this.prevValues === null) {
            console.log(`[${className}] initial:`, Object.keys(named).join(", "));
          } else {
            for (const key of keys) {
              if (this.prevValues[key] !== named[key]) {
                console.log(`[${className}] changed: ${String(key)}`, named[key]);
              }
            }
          }
          this.prevValues = { ...named };
        }

        if (this.debugLogInputChanges) {
          console.log(`[${this.constructor.name}] process()`);
        }
        const result = this.process(context, named);
        if (result instanceof Promise) return from(result);
        if (isObservable(result)) return result;
        return of(result);
      }),
      shareReplay(1),
    );

    super((subscriber) => source$.subscribe(subscriber));
    this.debugInputs = inputMap;
  }

  protected abstract process(context: ReactiveNodeContext, inputs: Inputs): Output | Promise<Output> | Observable<Output>;

  abstract dispose(): void;

  [Symbol.dispose](): void {
    this.dispose();
  }
}

export type ReactiveNodeInputs<Inputs extends Record<string, unknown>> = { [K in keyof Inputs]: Observable<Inputs[K]> };

// Type guard to check if an observable is a ReactiveNode
export function isReactiveNode(obs: Observable<unknown>): obs is ReactiveNode<Record<string, unknown>, unknown> {
  return (obs as ReactiveNode<Record<string, unknown>, unknown>).isReactiveNode === true;
}