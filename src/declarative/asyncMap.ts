import {
  computed,
  makeObservable,
  observable,
  onBecomeObserved,
  onBecomeUnobserved,
  reaction,
  action,
} from 'mobx';
import { AsyncErrorValue, AsyncValue } from './async';
import { GetterOf, MapperOf } from '@/util/typings';
import { Scope } from '@/context';

const unresolvedFlag = Symbol('unresolved');

export interface AsyncMapState<RESULT> {
  error: unknown;
  errored: boolean;
  value: RESULT;
  resolved: boolean;
  mapping: boolean;
}

// 这个类的作用是将一个异步函数的返回值转换为一个AsyncValue对象
// 可以用来实现例如异步IO、异步计算等功能
export class AsyncMap<INPUT, RESULT> implements AsyncErrorValue<RESULT> {
  private readonly input: GetterOf<AsyncValue<INPUT>>;

  private readonly mapper: MapperOf<[INPUT], Promise<RESULT>>;

  private readonly scope: Scope;

  private state: AsyncMapState<RESULT>;

  private reactionDisposer: (() => void) | null = null;

  public constructor(
    input: GetterOf<AsyncValue<INPUT>>,
    mapper: MapperOf<[INPUT], Promise<RESULT>>,
    initialVal: RESULT | typeof unresolvedFlag = unresolvedFlag,
    scope = Scope.requiredCurrent,
  ) {
    this.input = input;
    this.mapper = mapper;
    this.scope = scope;

    if (initialVal !== unresolvedFlag) {
      this.state = {
        error: null,
        errored: false,
        value: initialVal,
        resolved: true,
        mapping: false,
      };
    } else {
      this.state = {
        error: null,
        errored: false,
        value: null as any,
        resolved: false,
        mapping: false,
      };
    }

    makeObservable(this, {
      ['state' as string]: observable.ref,
      error: computed,
      errored: computed,
      value: computed,
      resolved: computed,
      mapping: computed,

      ['setMapping' as string]: action,
      ['setValue' as string]: action,
      ['setError' as string]: action,
    });

    // TODO: 增加eager模式的选项，让用户可以选择是否无需观察者

    // 默认模式是lazy，只有在有观察者的时候才会开始观察
    const disposeStartObserver = onBecomeObserved(this, 'state', () =>
      this.startObserving(),
    );
    const disposeStopObserver = onBecomeUnobserved(this, 'state', () =>
      this.stopObserving(),
    );

    scope.lifecycle.addDisposeListener(() => {
      disposeStartObserver();
      disposeStopObserver();
      this.stopObserving();
    });
  }

  public get error() {
    return this.state.error;
  }

  public get errored() {
    return this.state.errored;
  }

  public get value() {
    // TODO: 如果value没有被resolved，我们应当在控制台输出一个警告
    return this.state.value;
  }

  public get resolved() {
    return this.state.resolved;
  }

  public get mapping() {
    return this.state.mapping;
  }

  private startObserving() {
    // 如果scope已经被disposed，不会再观察
    if (this.scope.disposed) {
      return;
    }

    this.reactionDisposer = reaction(
      () => {
        const inputValue = this.input();
        return inputValue.resolved ? inputValue.value : unresolvedFlag;
      },
      value => {
        // 如果输入值没有准备好，我们不会执行更新
        if (value === unresolvedFlag) {
          return;
        }
        this.updateValue(value);
      },
      { fireImmediately: true },
    );
  }

  private stopObserving() {
    this.reactionDisposer?.();
  }

  private setMapping() {
    this.state = {
      ...this.state,
      mapping: true,
    };
  }

  private setValue(value: RESULT) {
    this.state = {
      error: null,
      errored: false,
      value,
      resolved: true,
      mapping: false,
    };
  }

  private setError(error: unknown) {
    this.state = {
      ...this.state,
      error,
      errored: true,
      mapping: false,
    };
  }

  private async updateValue(value: INPUT) {
    this.setMapping();
    try {
      const newValue = await this.mapper(value);
      this.setValue(newValue);
    } catch (error) {
      this.setError(error);
    }
  }
}
