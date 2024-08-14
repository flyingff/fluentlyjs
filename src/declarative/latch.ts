import { computed, makeObservable } from 'mobx';
import { AsyncValue, ResolvedAsyncValue } from './async';
import { EventRegistry } from './event';

// 接受一个可观察的AsyncValue，可以获得其最新的有效值
export class LastValidValueLatch<T> {
  private readonly getter: () => AsyncValue<T>;

  private _lastValidValue: AsyncValue<T> | null = null;

  public constructor(
    getter: () => AsyncValue<T>,
    initialValue: T | null = null,
  ) {
    this.getter = getter;
    this._lastValidValue =
      initialValue !== null ? new ResolvedAsyncValue(initialValue) : null;
    makeObservable(this, {
      ['_value' as string]: true,
      value: computed,
    });
  }

  public get value() {
    const asyncValue = this.getter();
    if (asyncValue.resolved) {
      this._lastValidValue = asyncValue;
    }
    return this._lastValidValue ? this._lastValidValue.value : null;
  }
}

export class GatedLatch<T> {
  private readonly getter: () => T;

  private _gated: boolean = false;

  private _value: T | null = null;

  public constructor(getter: () => T) {
    this.getter = getter;
    makeObservable(this, {
      ['_value' as string]: true,
      value: computed,
    });
  }

  public get value() {
    if (this._gated) {
      return this._value;
    }
    return this.getter();
  }

  private gate() {
    this._gated = true;
  }

  private open() {
    this._gated = false;
  }

  public configureWithEvent<E>(
    event: EventRegistry<E>,
    mapper: (event: E) => boolean,
  ) {
    let cancelled = false;
    // TODO: handle potential memory leak
    (async () => {
      for await (const ev of event.listen()) {
        if (cancelled) {
          break;
        }
        if (mapper(ev)) {
          this.gate();
        } else {
          this.open();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }
}
