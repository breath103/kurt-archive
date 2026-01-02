import { BehaviorSubject } from "rxjs";
import type { z } from "zod";

export class ValueNode<T> extends BehaviorSubject<T> {
  constructor(
    readonly name: string,
    readonly schema: z.ZodType<T>,
    initial: T,
  ) {
    super(initial);
  }

  get value(): T {
    return this.getValue();
  }

  set value(v: T) {
    this.next(this.schema.parse(v));
  }
}
