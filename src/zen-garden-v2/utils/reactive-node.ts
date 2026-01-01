import { combineLatest, from, isObservable, Observable, of, shareReplay, switchMap } from "rxjs";
import { type WebGLRenderer } from "three";

/**
 * Base class for reactive processing nodes.
 * Extends Observable so it integrates directly with RxJS.
 *
 * Example:
 * ```ts
 * type Inputs = { base: Texture; size: Vector2 };
 *
 * class DisplacementMap extends ReactiveNode<Inputs, Texture> {
 *   private renderTarget: WebGLRenderTarget;
 *
 *   constructor(
 *     private renderer: WebGLRenderer,
 *     inputs: { base: Observable<Texture>; size: Observable<Vector2> },
 *   ) {
 *     super(inputs);
 *     this.renderTarget = new WebGLRenderTarget(...);
 *   }
 *
 *   protected process({ base, size }: Inputs) {
 *     // render to target
 *     return this.renderTarget.texture;
 *   }
 *
 *   dispose() {
 *     this.renderTarget.dispose();
 *   }
 * }
 *
 * // Usage - it's just an Observable
 * const displacement = new DisplacementMap(renderer, { base: $base, size: $size });
 * displacement.subscribe(texture => material.displacementMap = texture);
 * ```
 */


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

  constructor(context: ReactiveNodeContext, inputs: ReactiveNodeInputs<Inputs>) {
    const keys = Object.keys(inputs) as (keyof Inputs)[];
    const observables = keys.map(k => inputs[k]);

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
  }

  protected abstract process(context: ReactiveNodeContext, inputs: Inputs): Output | Promise<Output> | Observable<Output>;

  abstract dispose(): void;

  [Symbol.dispose](): void {
    this.dispose();
  }
}

export type ReactiveNodeInputs<Inputs extends Record<string, unknown>> = { [K in keyof Inputs]: Observable<Inputs[K]> };