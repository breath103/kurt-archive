import type { Subscription } from "rxjs";

export class Subscriptions implements Disposable {
  private subscriptions: Subscription[] = [];

  add(subscription: Subscription) {
    this.subscriptions.push(subscription);
  }

  readonly [Symbol.dispose] = () => {
    this.subscriptions.map((s) => s.unsubscribe());
  }
}
