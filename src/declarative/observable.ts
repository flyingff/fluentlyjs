// 这是一个能将异步操作转换为可观察对象的类
// 依然使用mobx作为其底层实现

import { Scope } from '@/context';
import { observable, computed, makeObservable, runInAction } from 'mobx';

export class AsyncObservable<T> {
  private readonly generator: () => Generator<Promise<T>, void, void>;
  private _value: T;

  public constructor(
    generator: () => Generator<Promise<T>, void, void>,
    initialValue: T,
    scope = Scope.global,
  ) {
    this.generator = generator;
    this._value = initialValue;

    makeObservable(this, {
      ['_value' as string]: observable.ref,
      value: computed,
    });

    if (scope.disposed) {
      return;
    }

    const disposer = this.startObserving();
    scope.lifecycle.addDisposeListener(disposer);
  }

  private startObserving() {
    const generator = this.generator();

    let disposed = false;

    (async () => {
      for await (const event of generator) {
        if (disposed) {
          break;
        }
        runInAction(() => {
          this._value = event;
        });
      }
    })();

    return () => {
      disposed = true;
    };
  }

  @computed
  public get value() {
    return this._value;
  }
}
