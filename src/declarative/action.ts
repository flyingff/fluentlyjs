// 对“副作用”进行抽象
// 主要提供的能力是：
// 1. 通过 Effect 实例，描述一个副作用
// 2. 副作用的执行状态和结果（这里对执行结果的返回是有限制的，不能返回任何数据，只有成功与否、所花时间等统计信息）

// 这个类更应该叫action，还是effect呢？
//  - action没有规定它的发起者是谁，而effect则是一个更加专业的术语，专指副作用，其触发器基本上是值的变化
//  - action更加适合用来描述一个任务，而effect更加适合用来描述一个副作用
// 所以，此处应该使用action，毕竟我们的目的是描述一个通用的任务，而不是专指副作用

// * 这里遇到了一个困难，如何抽象“动作之间按顺序发生”关系？靠函数调用链吗？
// 有没有更好的方式？
// 想到的解决方案：
// - 通过事件的方式，让 Action 之间通过事件触发的方式来进行关联
// - action可以声明在执行完毕后触发的事件，这样就可以实现动作之间的顺序关系
// - 当然，这可能导致 Action 之间的耦合度增加，但是这样触发的事件全都以异步的时序发生
// - 这样的话，就可以保证每个宏任务只触发一个event，这样就可以保证事件不会陷入死循环
// - 但是这样的话，可能会导致事件的触发链过长，可能会导致事件的调试变得困难
// - 解决方式：在开发版本中，提供一个事件触发链的调试工具，可以查看事件的触发链，以及事件的触发顺序
// - 事件触发可以增加一个事件触发的深度，当事件触发深度超过一定值的时候，就会报错（好主意，防止死循环）
// - 事件触发的深度可以在开发环境中配置，可以在生产环境中关闭
//
// 总体来说，这个方案具有以下优点：
// - 可以保证事件的触发顺序，action不能直接调用其他action，只能通过事件触发
// - 可以保证事件的异步发生，不会让主线程陷入死循环
// - 可以保证事件的触发深度，提醒开发者事件触发链是否过长
// - 能够支持事件触发链的调试，可以查看事件的触发链，以及事件的触发顺序
// - 以声明式的方式，可以做到静态分析，能够通过工具在编译期检查触发链是否存在问题，如循环引用等
// 当然，这个方案也有以下缺点：
// - 事件的触发链可能会变得复杂（如果复杂性来自于业务逻辑，那么这是必然的）
// - 事件的触发链可能会变得难以调试（这个可以通过调试工具来解决）
import { action, computed, makeObservable, observable } from 'mobx';
import { EventRegistry } from './event';
import { Scope } from '@/context';

type ActionResultType = void | boolean;

type ActionResultWithData<DATA> = { result: ActionResultType; data: DATA };

type ActionExecutorReturnType<DATA> =
  | ActionResultType
  | ActionResultWithData<DATA>;

type PromiseOrValue<T> = T | Promise<T>;

type ActionState = 'initial' | 'running' | 'success' | 'failed';

export class Action<ARG, DATA = void> {
  private readonly actionExecutor: (
    arg: ARG,
  ) => PromiseOrValue<ActionExecutorReturnType<DATA>>;

  private readonly scope: Scope;

  private readonly eventSuccessTriggers: ((data: DATA, arg: ARG) => void)[] =
    [];

  private readonly eventFailedTriggers: ((reason: any, arg: ARG) => void)[] =
    [];

  private _state: ActionState = 'initial';

  private _error: unknown = undefined;

  /**
   * 最近一次执行的参数，目前还没有增加自动清理机制，有很小可能会造成内存泄漏
   */
  private _arg: ARG | undefined = undefined;

  public constructor(
    actionExecutor: (
      args: ARG,
    ) => PromiseOrValue<ActionExecutorReturnType<DATA>>,
    scope: Scope = Scope.global,
  ) {
    this.actionExecutor = actionExecutor;
    this.scope = scope;

    makeObservable(this, {
      ['_state' as string]: observable.ref,
      ['_error' as string]: observable.ref,
      state: computed,
      error: computed,
      arg: computed,
      isRunning: computed,
      isFailed: computed,
      run: action.bound,
      ['setResult' as string]: action,
      ['setFailed' as string]: action,
    });

    this.scope.lifecycle.addDisposeListener(() => {
      // 失去时，释放监听器
      this.eventSuccessTriggers.length = 0;
      this.eventFailedTriggers.length = 0;
    });
  }

  public get state() {
    return this._state;
  }

  public get isRunning() {
    return this._state === 'running';
  }

  public get isFailed() {
    return this._state === 'failed';
  }

  public get error() {
    return this._error;
  }

  public get arg() {
    return this._arg;
  }

  private setResult(returnValue: ActionExecutorReturnType<DATA>, arg: ARG) {
    let result: ActionResultType;
    let data: DATA | undefined;

    if (typeof returnValue === 'object' && returnValue !== null) {
      result = returnValue.result;
      data = returnValue.data;
    } else {
      result = returnValue;
    }

    if (result !== false) {
      this._state = 'success';
      this._error = undefined;

      // 触发成功事件
      this.triggerEvents(true, data!, arg);
      return true;
    } else {
      return this.setFailed(result, arg);
    }
  }

  private setFailed(error: unknown, arg: ARG) {
    this._state = 'failed';
    this._error = error;

    if (process.env.NODE_ENV === 'development') {
      console.error('Action failed:', error);
    }

    // 触发失败事件
    this.triggerEvents(false, undefined as any, arg);

    return false;
  }

  private triggerEvents(result: boolean, data: DATA, arg: ARG) {
    if (result) {
      this.eventSuccessTriggers.forEach((trigger) => trigger(data, arg));
    } else {
      this.eventFailedTriggers.forEach((trigger) => trigger(this._error, arg));
    }
  }

  public run(...args: ARG extends void ? [] : [ARG]) {
    if (this.scope.disposed) {
      return false;
    }

    const arg = args[0]!;
    this._state = 'running';
    this._arg = arg;

    try {
      const result = this.actionExecutor(arg);
      if (result instanceof Promise) {
        return result.then(
          (res) => this.setResult(res, arg),
          (error) => this.setFailed(error, arg),
        );
      }
      return this.setResult(result, arg);
    } catch (error) {
      return this.setFailed(error, arg);
    }
  }

  public runOn<EVENT>(
    event: EventRegistry<EVENT>,
    mapper: (event: EVENT) => ARG,
    filter?: (event: EVENT) => boolean,
  ) {
    return event.triggerAction((event) => {
      // 如果filter存在，且filter返回false，则不执行
      if (filter && !filter(event)) {
        return;
      }
      const args = mapper(event);
      // 此处this.run将cast为any是因为run方法的参数做了类型判断，但此处无法判断
      return (this.run as any)(args);
    });
  }

  public triggersDoneEvent(
    eventSource: EventRegistry<DATA>,
    condition?: (data: DATA) => boolean,
  ) {
    this.eventSuccessTriggers.push((data) => {
      if (!condition || condition(data)) {
        eventSource.emitOnce(data);
      }
    });
  }

  public triggersFailedEvent<T>(
    eventSource: EventRegistry<T>,
    mapper: (reason: unknown, arg: ARG) => T,
    condition?: (reason: unknown) => boolean,
  ) {
    this.eventFailedTriggers.push((reason, arg) => {
      if (!condition || condition(reason)) {
        eventSource.emitOnce(mapper(reason, arg));
      }
    });
  }

  public triggersDoneEventWithMapper<EVENT>(
    eventSource: EventRegistry<EVENT>,
    mapper: (data: DATA, arg: ARG) => EVENT,
    condition?: (data: DATA) => boolean,
  ) {
    this.eventSuccessTriggers.push((data, arg) => {
      if (!condition || condition(data)) {
        eventSource.emitOnce(mapper(data, arg));
      }
    });
  }
}
