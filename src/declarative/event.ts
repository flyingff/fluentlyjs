import { Scope, Scoped, scopeDisposeSymbol } from '@/context';
import { AsyncValue } from './async';
import EventEmitter from 'events';
import { runInAction } from 'mobx';
import { Action } from './action';

export interface EventSourceRegister<EVENT> {
  (listener: (event: EVENT) => void): () => void;
}

export class EventRegistry<EventType> implements Scoped {
  public readonly scope: Scope;

  private readonly emitter = new EventEmitter();

  private readonly companionTriggers: ((event: EventType) => void)[] = [];

  public readonly emitOnce = (event: EventType) => {
    if (this.scope.disposed) {
      return;
    }
    // 是否可以做到，在“一次”事件触发中，满足
    runInAction(() => {
      this.emitter.emit('event', event);
    });
  };

  public constructor(scope: Scope = Scope.global) {
    this.scope = scope;
  }
  [scopeDisposeSymbol](): void {
    throw new Error('Method not implemented.');
  }

  /**
   * 增加绑定事件
   */
  public registry(register: EventSourceRegister<EventType>) {
    if (this.scope.disposed) {
      return;
    }

    const unregister = register(this.emitOnce);

    this.scope.lifecycle.addDisposeListener(unregister);

    return unregister;
  }

  /**
   * 这个方法用于将事件转换为异步迭代器
   */
  private async *generatorFactory(): AsyncGenerator<EventType, void, void> {
    const eventQueue: EventType[] = [];
    let fnNotify: () => void = () => {};
    let cancelled = false;

    const eventHandler = (value: EventType) => {
      if (cancelled) {
        return;
      }
      eventQueue.push(value);
      fnNotify();
    };
    this.emitter.on('event', eventHandler);

    try {
      while (!cancelled) {
        if (eventQueue.length > 0) {
          yield eventQueue.shift()!;
        } else {
          await new Promise<void>((resolve) => {
            fnNotify = resolve;
          });
        }
      }
    } finally {
      cancelled = true;
      fnNotify();
      this.emitter.off('event', eventHandler);
    }
  }

  /**
   * 监听事件
   * 这个方法主要处理scope销毁的情况，当scope销毁时，结束监听事件
   */
  public async *listen() {
    const generator = this.generatorFactory();
    const scopeDisposePromise = this.scope.lifecycle.asPromise;

    while (!this.scope.disposed) {
      const eventPromise = generator.next();
      const result = await Promise.race([scopeDisposePromise, eventPromise]);
      // 这里只有两种情况，一种是scope销毁，一种是事件触发
      if (this.scope.disposed || !result || !('value' in result)) {
        break;
      } else {
        const { value, done } = result;
        // 如果没有更多的事件了，那么我们就退出
        if (done) {
          break;
        }
        // 如果事件触发，那么我们将事件返回
        yield value;
      }
    }
  }

  /**
   * 尽量不要在业务代码中使用这个方法，尽量使用Action类的实例来触发动作
   */
  public triggerAction(action: (event: EventType) => void) {
    this.emitter.on('event', action);
    return () => {
      this.emitter.off('event', action);
    };
  }

  public triggerCompanion(companion: (event: EventType) => void) {
    this.companionTriggers.push(companion);
  }
}

// 这个类用于将事件转换为可观察对象，保留最后一个事件
export class LastEventValue<T> implements AsyncValue<T | null> {
  private lastEvent: T | null = null;
  private hasFirstEventArrived = false;

  public constructor(eventSource: EventRegistry<T>, scope = eventSource.scope) {
    const disposer = this.startObserving(eventSource);
    scope.lifecycle.addDisposeListener(disposer);
  }

  private startObserving(eventSource: EventRegistry<T>) {
    const generator = eventSource.listen();

    let disposed = false;

    (async () => {
      for await (const event of generator) {
        if (disposed) {
          break;
        }
        this.lastEvent = event;
        this.hasFirstEventArrived = true;
      }
    })();

    return () => {
      disposed = true;
    };
  }

  public get value() {
    return this.lastEvent;
  }

  public get resolved() {
    return this.hasFirstEventArrived;
  }
}
