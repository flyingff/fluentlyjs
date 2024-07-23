import { Scope } from '@/context';
import { AsyncValue } from './async';
import { EventRegistry } from './event';
import { computed, makeObservable, observable, runInAction } from 'mobx';

export interface ValueReducer<EVENT, T> {
  reducer: (value: T, event: EVENT) => T;
  eventSource: EventRegistry<EVENT>;
}

export class ReducedValue<T> implements AsyncValue<T> {
  public static builder<T>() {
    return new ReducedValueBuilder<T>();
  }

  public static lastMappedEventValue<EVENT, VALUE>(
    event: EventRegistry<EVENT>,
    initialValue: VALUE,
    mapper: (event: EVENT) => VALUE,
    filter?: (event: EVENT) => boolean,
  ) {
    const reducer: ValueReducer<EVENT, VALUE> = {
      eventSource: event,
      reducer: (oldValue, event) => {
        const filterCheckResult = filter ? filter(event) : true;
        return filterCheckResult ? mapper(event) : oldValue;
      },
    };
    return new ReducedValue(initialValue, [reducer]);
  }

  public static lastEventValue<EVENT>(
    event: EventRegistry<EVENT>,
    initialValue: EVENT,
    filter?: (event: EVENT) => boolean,
  ) {
    return ReducedValue.lastMappedEventValue<EVENT, EVENT>(
      event,
      initialValue,
      (event) => event,
      filter,
    );
  }

  private _value: T;
  public constructor(initialValue: T, reducers: ValueReducer<any, T>[]) {
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
    eventSource: EventRegistry<EVENT>,
    reducer: (value: T, event: EVENT) => T,
  ) {
    this.reducers.push({ reducer, eventSource });
    return this;
  }

  public build(initialValue: T) {
    return new ReducedValue<T>(initialValue, this.reducers);
  }
}
