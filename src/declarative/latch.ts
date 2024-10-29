import { computed, makeObservable } from 'mobx';
import { AsyncValue, ResolvedAsyncValue } from './async';
import { EventRegistry } from './event';

/**
 * 根据状态判定是否启用的门闩，可以用来“拒绝”某些更新
 *
 * 可以用于实现诸如：
 *  * 用户在已展示一次查询的情况下，发起第二个查询，但是返回出错了，此时可以保持界面展示的值为第一次查询的结果；
 *  * 用户在输入数字时，只在用户输入了有效的数字后才更新界面，防止无效的输入导致界面频繁更新
 *
 * 等功能。
 *
 * 注意：该类不是一个“主动”类，它不会自动更新，而是需要观察者自行调用value来获取当前的值；
 * 也就是说，在没有观察者的情况下，该类不会自动更新内部的“最近有效值”。
 */
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

/**
 * 根据动作配置的门闩，在启用时可以“留住”当前的值，不再更新.
 *
 * 启用和禁用的动作是通过事件触发的;
 *
 * 可以用于实现诸如：
 *  * 表单提交过程中，保持界面展示的值为用户输入的值，而不是当前生效的（旧）值，在提交完成后再切换回来
 *
 * 等功能。
 *
 * 注意：该类应当配合EventRegistry使用，不要直接调用gate和open方法。
 *
 */
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

  /**
   * 获取当前的值；如果门闩开启，则返回上一次的值，否则与getter的值同步
   */
  public get value() {
    if (this._gated) {
      return this._value;
    }
    return (this._value = this.getter());
  }

  /**
   * 进入门闩状态，此时value的值将保持当前值，不再更新
   */
  private gate() {
    this._gated = true;
    this._value = this.getter();
  }

  /**
   * 退出门闩状态，此时value的值将会跟随getter的值
   */
  private open() {
    this._gated = false;
  }

  /**
   * 根据事件配置门闩是否开启
   * @param event 相关的事件
   * @param mapper 事件映射函数，返回true表示启用门闩，返回false表示关闭门闩
   * @returns 取消函数
   */
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
