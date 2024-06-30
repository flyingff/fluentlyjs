import { computed, makeObservable, observable, runInAction } from 'mobx';

export interface AsyncValue<T> {
  value: T;
  resolved: boolean;
}

// 这是支持捕获错误的异步值，它额外具有一个reason字段、status字段
export interface AsyncErrorValue<T, ERR = unknown> extends AsyncValue<T> {
  error: ERR;
  errored: boolean;
}

// 这是一个可观察版本的Promise，它可以将异步操作的结果转换为可观察对象
export class AsyncPromiseValue<T> implements AsyncErrorValue<T | null> {
  private _value: T | null;
  private _reason: any;
  private _status: 'pending' | 'fulfilled' | 'rejected' = 'pending';

  public constructor(promise: Promise<T>) {
    this._value = null;
    this._reason = null;
    promise.then(
      (value) => {
        runInAction(() => {
          this._value = value;
          this._status = 'fulfilled';
        });
      },
      (reason) => {
        runInAction(() => {
          this._reason = reason;
          this._status = 'rejected';
        });
      },
    );

    makeObservable(this, {
      ['_value' as string]: observable.ref,
      ['_reason' as string]: observable.ref,
      ['_status' as string]: observable.ref,
      value: computed,
      error: computed,
      resolved: computed,
      errored: computed,
      status: computed,
    });
  }

  public get value() {
    return this._value;
  }

  public get resolved() {
    return this._status === 'fulfilled';
  }

  public get error() {
    return this._reason;
  }

  public get errored() {
    return this._status === 'rejected';
  }

  public get status() {
    return this._status;
  }
}

export class ResolvedAsyncValue<T> implements AsyncValue<T> {
  private readonly _value: T;
  public constructor(value: T) {
    this._value = value;
  }

  public get value() {
    return this._value;
  }

  public resolved = true;
}

export class RejectedAsyncValue<T, ERR = unknown>
  implements AsyncErrorValue<T, ERR>
{
  private readonly _value: T;
  private readonly _error: ERR;
  public constructor(value: T, error: ERR) {
    this._value = value;
    this._error = error;
  }

  public get value() {
    return this._value;
  }

  public get error() {
    return this._error;
  }

  public get resolved() {
    return false;
  }

  public get errored() {
    return true;
  }
}
