import EventEmitter from 'events';
import { runInAction } from 'mobx';
import { AsyncValue } from './async';
import { Scope, Scoped, scopeDisposeSymbol } from '@/context';
import { createStackContext } from '@/util/stack';
import { getCurrentDeclarePosition } from '@/util/debug';

export type EventSourceRegister<EVENT> = (
  listener: (event: EVENT) => void,
) => () => void;

type EventExecutor = () => void;

const triggeredEventCollectorContext = createStackContext<Set<EventExecutor>>();

export class EventRegistry<EventType> implements Scoped {
  /**
   * 用于标识事件的名称，主要用于调试
   */
  public readonly name: string;

  public readonly scope: Scope;

  private readonly emitter: EventEmitter = new EventEmitter();

  /** 关联事件的集合 */
  private readonly linkedEvents: Set<(event: EventType) => void> = new Set();

  public constructor(
    name: string = getCurrentDeclarePosition(),
    scope: Scope = Scope.requiredCurrent,
  ) {
    this.name = name;
    this.scope = scope;
  }

  public readonly emitOnce = (event: EventType) => {
    if (this.scope.disposed) {
      return;
    }

    const executorCollector = triggeredEventCollectorContext.getContextValue();
    // 如果当前事件触发非最外层，那么添加触发函数到当前事件触发的集合中
    if (executorCollector) {
      executorCollector.add(() => this.emitEvent(event));
      return;
    }

    // "一轮"触发事件，当前event是根事件
    // 收集该轮触发的所有事件的集合
    const rootExecutorCollector: Set<EventExecutor> = new Set();

    triggeredEventCollectorContext.runInContext(rootExecutorCollector, () => {
      // 首先触发一次当前事件
      this.emitEvent(event);

      // 然后迭代触发所有的事件
      while (rootExecutorCollector.size > 0) {
        const executorIterated = rootExecutorCollector.values().next();
        if (executorIterated.done) {
          break;
        }
        const executor = executorIterated.value;
        rootExecutorCollector.delete(executor);
        executor();
      }
    });
  };

  /**
   * 触发事件
   */
  private emitEvent(event: EventType) {
    runInAction(() => {
      // 在单次事件触发时，先触发当前事件
      this.emitter.emit('event', event);
      // 然后触发所有关联事件
      this.linkedEvents.forEach(linkedEvent => {
        linkedEvent(event);
      });
    });
  }

  [scopeDisposeSymbol](): void {
    // remove all listeners to avoid memory leak
    this.emitter.removeAllListeners();
    this.linkedEvents.clear();
  }

  /**
   * 增加绑定事件
   */
  public registry(register: EventSourceRegister<EventType>) {
    if (this.scope.disposed) {
      return () => {
        /** do nothing */
      };
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
    let fnNotify: () => void = () => {
      /** do nothing */
    };
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
      // eslint-disable-next-line no-unmodified-loop-condition
      while (!cancelled) {
        if (eventQueue.length > 0) {
          yield eventQueue.shift()!;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          await new Promise<void>(resolve => {
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
   *
   * 这个方法可以将事件以流的方式返回，当scope销毁时，这个方法会自动退出
   *
   * 同时，这个方法也支持传入其它的disposer，当disposer中的任意一个触发时，这个方法也会退出
   *
   * @argument disposers 可以传入Promise、AbortSignal、Scope实例
   */
  public async *listen(...disposers: (Promise<void> | AbortSignal | Scope)[]) {
    let disposed = false;

    const scopeDisposePromises = [
      this.scope.lifecycle.asPromise,
      ...disposers,
    ].map(promise => {
      if (promise instanceof Promise) {
        return promise;
      } else if (promise instanceof AbortSignal) {
        return new Promise<void>(resolve => {
          promise.addEventListener('abort', () => resolve());
        });
      } else {
        return promise.lifecycle.asPromise;
      }
    });

    const scopeDisposePromise = Promise.race(scopeDisposePromises);

    scopeDisposePromise.then(() => {
      disposed = true;
    });

    const generator = this.generatorFactory();
    // eslint-disable-next-line no-unmodified-loop-condition
    while (!disposed) {
      const eventPromise = generator.next();
      const result = await Promise.race([scopeDisposePromise, eventPromise]);
      // 这里只有两种情况，一种是scope销毁，一种是事件触发
      if (disposed || !result || !('value' in result)) {
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
   * 事件联动触发，当事件触发时，会触发另一个事件
   */
  public linkTo(
    eventSource: EventRegistry<EventType>,
    condition?: (event: EventType) => boolean,
  ) {
    return this.linkToWithMapper(eventSource, event => event, condition);
  }

  /**
   * 事件联动触发，当事件触发时，会触发另一个事件；
   *
   * 同时，这个方法还支持对事件类型进行转换
   */
  public linkToWithMapper<NewEventType>(
    eventSource: EventRegistry<NewEventType>,
    mapper: (event: EventType) => NewEventType,
    condition?: (event: EventType) => boolean,
  ) {
    const linkFunction = (event: EventType) => {
      if (condition && !condition(event)) {
        return;
      }

      eventSource.emitOnce(mapper(event));
    };
    this.linkedEvents.add(linkFunction);
    return () => {
      this.linkedEvents.delete(linkFunction);
    };
  }
}

// 这个类用于将事件转换为可观察对象，保留最后一个事件
export class LastEventValue<T> implements AsyncValue<T | null> {
  private lastEvent: T | null = null;

  private hasFirstEventArrived: boolean = false;

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
