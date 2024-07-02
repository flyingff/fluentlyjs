import { Scope } from '@/context';
import { AsyncValue } from './async';
import { EventSource } from './event';
import { computed, makeObservable, observable, runInAction } from 'mobx';

export interface ValueReducer<EVENT, T> {
  reducer: (value: T, event: EVENT) => T;
  eventSource: EventSource<EVENT>;
}

export class ReducedValue<T> implements AsyncValue<T> {
  public static builder<T>() {
    return new ReducedValueBuilder<T>();
  }

  private _value: T;
  public constructor(initialValue: T, reducers: ValueReducer<T, any>[]) {
    this._value = initialValue;
    makeObservable(this, {
      ['_value' as string]: observable.ref,
      value: computed,
    });

    // 这里我们将所有的reducer的事件源都监听起来
    this.listenAllEvents(reducers);
  }

  private listenAllEvents(reducers: ValueReducer<any, T>[]) {
    for (const reducer of reducers) {
      (async () => {
        for await (const event of reducer.eventSource.listen()) {
          // TODO: add try catch here
          runInAction(() => {
            this._value = reducer.reducer(this._value, event);
          });
        }
      })();
    }
  }

  public get value() {
    return this._value;
  }

  public get resolved() {
    return true;
  }
}

class ReducedValueBuilder<T> {
  private readonly reducers: ValueReducer<any, T>[] = [];
  public constructor() {
    this.reducers = [];
  }

  public addReducer<EVENT>(
    eventSource: EventSource<EVENT>,
    reducer: (value: T, event: EVENT) => T,
  ) {
    this.reducers.push({ reducer, eventSource });
    return this;
  }

  public build(initialValue: T) {
    return new ReducedValue<T>(initialValue, this.reducers);
  }
}
