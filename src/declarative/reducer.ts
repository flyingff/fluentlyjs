import { computed, makeObservable, observable } from 'mobx';
import { AsyncValue } from './async';
import { EventRegistry } from './event';
import { Scope } from '@/context';

/**
 * 表示一个事件和它的reducer函数，表达了如何将一个“事件”转换为一个“值的变化”。
 *
 * 一般不需要直接创建实现该接口的对象，而是使用 {@link ReducedValueBuilder} 或者 {@link ReducedValue.builder} 。
 */
export interface ValueReducer<EventValueType, T> {
  reducer: (value: T, event: EventValueType) => T;
  eventSource: EventRegistry<EventValueType>;
}

/**
 * 将一系列事件转换为一个值的变化的对象，就像redux那样。
 *
 * 这应当是修改“状态”的唯一途径，所有状态的变化都应当通过这个对象来完成。
 *
 * 触发状态变化需要配合“事件” {@link EventRegistry} 来完成。
 *
 * 注意：一般不要使用默认构造函数，而是使用 {@link ReducedValue.builder} 来构建ReducedValue对象。
 */
export class ReducedValue<T> implements AsyncValue<T> {
  /**
   * 通过builder模式创建一个ReducedValue对象。
   */
  public static builder<T>() {
    return new ReducedValueBuilder<T>();
  }

  /**
   * 快速创建一个只保留最后一个事件的ReducedValue对象。一般用于实现“事件”到“状态”的映射。
   *
   * @param event 要转化为状态的事件
   * @param initialValue 初始状态，即事件首次触发前的状态
   * @param mapper 事件对象到状态的映射函数
   * @param filter 事件过滤函数。如果返回false，则不会触发状态变化
   * @returns 一个ReducedValue对象
   */
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

  /**
   * 简化版的 {@link lastMappedEventValue}，当无需映射事件值时，可以使用这个方法。
   *
   * @see lastMappedEventValue
   */
  public static lastEventValue<EVENT>(
    event: EventRegistry<EVENT>,
    initialValue: EVENT,
    filter?: (event: EVENT) => boolean,
  ) {
    return ReducedValue.lastMappedEventValue<EVENT, EVENT>(
      event,
      initialValue,
      event => event,
      filter,
    );
  }

  public readonly resolved: boolean = true;

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
    // 获取当前的作用域，当作用域销毁时，这个函数会自动停止监听
    const currentScope = Scope.requiredCurrent;
    for (const reducer of reducers) {
      reducer.eventSource.listenSync(event => {
        try {
          this._value = reducer.reducer(this._value, event);
        } catch (ex) {
          console.error('[fluentlyjs] Error when reducing value', ex);
        }
      }, currentScope);
    }
  }

  /**
   * 获取当前的值
   */
  public get value() {
    return this._value;
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
