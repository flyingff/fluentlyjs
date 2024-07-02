// 对“副作用”进行抽象
// 主要提供的能力是：
// 1. 通过 Effect 实例，描述一个副作用
// 2. 副作用的执行状态和结果（这里对执行结果的返回是有限制的，不能返回任何数据，只有成功与否、所花时间等统计信息）

// 这个类更应该叫action，还是effect呢？
//  - action没有规定它的发起者是谁，而effect则是一个更加专业的术语，专指副作用，其触发器基本上是值的变化
//  - action更加适合用来描述一个任务，而effect更加适合用来描述一个副作用
// 所以，此处应该使用action，毕竟我们的目的是描述一个通用的任务，而不是专指副作用

import { action, computed, makeObservable, observable } from 'mobx';
import { EventSource } from './event';

type ActionReturnType = void | boolean;

type ActionState = 'initial' | 'running' | 'success' | 'failed';

export class Action<ARG> {
  private readonly actionExecutor: (
    arg: ARG,
  ) => ActionReturnType | Promise<ActionReturnType>;

  private _state: ActionState = 'initial';

  private _error: unknown = undefined;

  public constructor(
    actionExecutor: (args: ARG) => ActionReturnType | Promise<ActionReturnType>,
  ) {
    this.actionExecutor = actionExecutor;

    makeObservable(this, {
      ['_state' as string]: observable.ref,
      ['_error' as string]: observable.ref,
      state: computed,
      error: computed,
      run: action.bound,
      ['setResult' as string]: action,
      ['setFailed' as string]: action,
    });
  }

  public get state() {
    return this._state;
  }

  public get error() {
    return this._error;
  }

  private setResult(result: ActionReturnType) {
    if (result !== false) {
      this._state = 'success';
      this._error = undefined;
      return true;
    } else {
      return this.setFailed(result);
    }
  }

  private setFailed(error: unknown) {
    this._state = 'failed';
    this._error = error;

    return false;
  }

  public run(...args: ARG extends void ? [] : [ARG]) {
    this._state = 'running';

    try {
      const result = this.actionExecutor(args[0]!);
      if (result instanceof Promise) {
        return result.then(
          (res) => this.setResult(res),
          (error) => this.setFailed(error),
        );
      }
      return this.setResult(result);
    } catch (error) {
      return this.setFailed(error);
    }
  }

  public runOn<EVENT>(
    event: EventSource<EVENT>,
    mapper: (event: EVENT) => ARG,
    filter?: (event: EVENT) => boolean,
  ) {
    return event.triggerAction((event) => {
      // 如果filter存在，且filter返回false，则不执行
      if (filter && !filter(event)) {
        return;
      }
      // 这个any是因为我们无法确定mapper的返回值是否是ARG类型
      return (this.run as any)(mapper(event));
    });
  }
}
